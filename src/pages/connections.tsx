import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/supabase';
import { Layout } from "@/components/layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useSearchParams, Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MinusCircle } from "lucide-react";
import GoogleAnalyticsIcon from '@/assets/google-analytics.svg';
import { AnalyticsConnection, fetchGoogleAnalyticsProperties, getGoogleAuthUrl } from '@/integrations/google-analytics/ga-connection';

interface Property {
  id: string;
  name: string;
  domain?: string;
  stripeAccountId?: string;
}

interface StripeConnection {
  account_id: string;
  account_name: string;
  access_token: string;
}

export function ConnectionsPage() {
  const [connections, setConnections] = useState<AnalyticsConnection[]>([]);
  const [stripeConnections, setStripeConnections] = useState<StripeConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const connected = searchParams.get('connected');
  const [availableProperties, setAvailableProperties] = useState<Record<string, Property[]>>({});

  useEffect(() => {
    loadConnections();
    loadStripeConnections();
  }, []);

  useEffect(() => {
    if (connected) {
      console.log('Successfully connected!');
    }
    if (error) {
      console.error('Connection error:', error);
    }
  }, [connected, error]);

  async function loadConnections() {
    const { data, error } = await supabase
      .from('analytics_connections')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setConnections(data);
      data.forEach(async (connection) => {
        const properties = await fetchGoogleAnalyticsProperties(connection.access_token);
        setAvailableProperties(prev => ({
          ...prev,
          [connection.account_email]: properties
        }));
      });
    }
  }

  async function loadStripeConnections() {
    const { data, error } = await supabase
      .from('stripe_connections')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setStripeConnections(data);
    }
  }

  const connectNewAccount = () => {
    try {
      setIsConnecting(true);
      window.location.href = getGoogleAuthUrl();
    } catch (error) {
      console.error('Error connecting to Google Analytics:', error);
      setIsConnecting(false);
    }
  };

  const connectStripeAccount = () => {
    try {
      setIsConnecting(true);
      window.location.href = getStripeAuthUrl();
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      setIsConnecting(false);
    }
  };

  async function handlePropertyToggle(connectionEmail: string, propertyId: string) {
    const connection = connections.find(c => c.account_email === connectionEmail);
    if (!connection) return;

    const newPropertyIds = connection.property_ids.includes(propertyId)
      ? connection.property_ids.filter(id => id !== propertyId)
      : [...connection.property_ids, propertyId];

    const { error } = await supabase
      .from('analytics_connections')
      .update({ property_ids: newPropertyIds })
      .eq('account_email', connectionEmail);

    if (!error) {
      setConnections(connections.map(c => 
        c.account_email === connectionEmail 
          ? { ...c, property_ids: newPropertyIds }
          : c
      ));
    }
  }

  async function linkStripeToProperty(propertyId: string, stripeAccountId: string) {
    const { error } = await supabase
      .from('analytics_properties_stripe')
      .upsert({ 
        property_id: propertyId,
        stripe_account_id: stripeAccountId
      });

    if (!error) {
      setAvailableProperties(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          stripeAccountId
        }
      }));
    }
  }

  async function handleDisconnect(accountEmail: string) {
    const { error } = await supabase
      .from('analytics_connections')
      .delete()
      .eq('account_email', accountEmail);

    if (!error) {
      setConnections(connections.filter(c => c.account_email !== accountEmail));
    }
  }

  return (
    <Layout>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/" className="hover:underline">Home</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Connections</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Analytics Connections</h1>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
              onClick={connectNewAccount}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Google Analytics"}
            </button>
            <button 
              className="px-4 py-2 bg-[#635BFF] text-white rounded-lg flex items-center gap-2"
              onClick={connectStripeAccount}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Stripe"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {connections.map((connection, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={GoogleAnalyticsIcon} alt="Google Analytics" className="w-6 h-6" />
                    <span>{connection.account_email}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDisconnect(connection.account_email)}
                    className="text-destructive"
                  >
                    Disconnect
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select
                    onValueChange={(value) => handlePropertyToggle(connection.account_email, value)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a property to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties[connection.account_email]?.map((property) => (
                        <SelectItem
                          key={property.id}
                          value={property.id}
                          disabled={connection.property_ids.includes(property.id)}
                        >
                          {property.domain || property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {connection.property_ids.map((propertyId) => {
                    const property = availableProperties[connection.account_email]?.find(p => p.id === propertyId);
                    return (
                      <div key={propertyId} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <span>{property?.domain || property?.name || propertyId}</span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={property?.stripeAccountId}
                            onValueChange={(value) => linkStripeToProperty(propertyId, value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Link Stripe Account" />
                            </SelectTrigger>
                            <SelectContent>
                              {stripeConnections.map((stripe) => (
                                <SelectItem key={stripe.account_id} value={stripe.account_id}>
                                  {stripe.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePropertyToggle(connection.account_email, propertyId)}
                          >
                            <MinusCircle className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {connections.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No analytics connections yet. Click "Connect New Account" to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
} 