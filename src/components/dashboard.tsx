import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from 'recharts';
import { useAuth } from "@/integrations/supabase/auth-context";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/supabase';
import { AnalyticsConnection, fetchGoogleAnalyticsProperties, fetchVisitorData } from '@/integrations/google-analytics/ga-connection';
import { Button } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";

interface WebsiteStats {
  name: string;
  domain: string;
  visitors: number;
  revenue?: number;
  data: { time: string; label: string; visitors: number; revenue: number }[];
}

export function Dashboard() {
  const { user } = useAuth();
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'visitors' | 'revenue'>('visitors');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  async function loadAnalyticsData() {
    try {
      const { data: connections, error } = await supabase
        .from('analytics_connections')
        .select('*');

      if (error) throw error;

      const endTime = new Date();
      const startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - 7);

      const statsPromises = connections.flatMap(async (connection: AnalyticsConnection) => {
        const properties = await fetchGoogleAnalyticsProperties(connection.access_token);
        
        const propertyPromises = properties
          .filter(property => connection.property_ids.includes(property.id))
          .map(async property => {
            const { totalVisitors, totalRevenue, hourlyData } = await fetchVisitorData(
              connection.access_token,
              property.id,
              startTime,
              endTime
            );

            return {
              name: property.name,
              domain: property.domain || property.name,
              visitors: totalVisitors,
              revenue: totalRevenue,
              data: hourlyData
            };
          });

        return Promise.all(propertyPromises);
      });

      const stats = await Promise.all(statsPromises);
      // Sort by revenue (if exists) then by visitors
      const sortedStats = stats.flat().sort((a, b) => {
        if (a.revenue && b.revenue) {
          if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        }
        return b.visitors - a.visitors;
      });
      
      setWebsiteStats(sortedStats);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalVisitors = websiteStats.reduce((sum, site) => sum + site.visitors, 0);
  const totalRevenue = websiteStats.reduce((sum, site) => sum + (site.revenue ?? 0), 0);
  
  const maxValue = Math.max(
    ...websiteStats.flatMap(site => 
      site.data.map(point => activeMetric === 'visitors' ? point.visitors : (point.revenue || 0))
    )
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-[500px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>

        {/* Website Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-6 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[220px] w-full" />
                <div className="flex items-center justify-between mt-4">
                  <Skeleton className="h-5 w-[100px]" />
                  <Skeleton className="h-5 w-[100px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-normal">
          Hey {user?.user_metadata?.name?.split(' ')[0] || 'there'}, 
          {websiteStats.length > 0 
            ? ` you got `
            : ' connect your first analytics account to see your stats.'}
          {websiteStats.length > 0 && (
            <>
              <span className="font-bold">{totalVisitors.toLocaleString()} visitors</span>
              {totalRevenue > 0 && (
                <>
                  {' and '}
                  <span className="font-bold">${Math.round(totalRevenue).toLocaleString()} sales</span>
                </>
              )}
              {' in the last 7 days.'}
            </>
          )}
        </h2>
        <Button 
          variant="secondary" 
          asChild
        >
          <Link to="/connections">
            Manage Connections
          </Link>
        </Button>
      </div>

      {/* Website Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {websiteStats.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No analytics connections yet. Click "Manage Connections" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          websiteStats.map((site) => (
            <Card key={site.domain} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`}
                    alt=""
                    className="w-4 h-4"
                    onError={(e) => {
                      e.currentTarget.src = `https://${site.domain}/favicon.ico`;
                    }}
                  />
                  {site.domain}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={site.data}
                      margin={{
                        top: 20,
                        right: 10,
                        left: 10,
                        bottom: 5
                      }}
                    >
                      <defs>
                        <linearGradient id={`gradient-${site.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.4}
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={true}
                        stroke="hsl(var(--border))"
                        fontSize={12}
                        tick={{ fill: "hsl(var(--foreground))" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        hide
                        domain={[0, maxValue]}
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const value = activeMetric === 'revenue' 
                              ? `$${Math.round(Number(payload[0].value) || 0).toLocaleString()}`
                              : (Number(payload[0].value) || 0).toLocaleString();
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {activeMetric === 'revenue' ? 'Sales' : 'Visitors'}
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {value}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        key={`area-${activeMetric}`}
                        type="monotone"
                        dataKey={activeMetric}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill={`url(#gradient-${site.name})`}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setActiveMetric('visitors')}
                    className={`text-sm font-medium transition-colors ${
                      activeMetric === 'visitors' 
                        ? 'text-primary' 
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {site.visitors.toLocaleString()} visitors
                  </button>
                  {(site.revenue ?? 0) > 0 && (
                    <button
                      onClick={() => setActiveMetric('revenue')}
                      className={`text-sm font-medium transition-colors ${
                        activeMetric === 'revenue' 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      ${Math.round(site.revenue ?? 0).toLocaleString()} sales
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
