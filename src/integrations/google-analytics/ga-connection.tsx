export interface AnalyticsConnection {
  access_token: string;
  property_ids: string[];
  token_expiry: string;
  account_email: string;
  available_properties?: Array<{
    id: string;
    name: string;
    domain: string;
  }>;
}

interface AccountSummary {
  propertySummaries?: Array<{
    property: string;
    displayName: string;
  }>;
}

interface DataStream {
  type: string;
  webStreamData?: {
    defaultUri: string;
  };
}

interface RunReportResponse {
  rows?: Array<{
    metricValues: Array<{
      value: string;
    }>;
    dimensionValues: Array<{
      value: string;
    }>;
  }>;
}

export async function fetchGoogleAnalyticsProperties(accessToken: string) {
  try {
    // First, get the account summaries which includes GA4 properties
    const summariesResponse = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!summariesResponse.ok) {
      console.error('GA Summaries Error:', await summariesResponse.text());
      return [];
    }

    const summariesData = await summariesResponse.json();
    
    // Get properties with additional data
    const propertiesPromises = summariesData.accountSummaries?.flatMap(async (account: AccountSummary) => {
      return Promise.all(account.propertySummaries?.map(async (property) => {
        const propertyId = property.property.split('/').pop();
        // Fetch additional property data including domain
        const dataStreamsResponse = await fetch(
          `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        
        if (!dataStreamsResponse.ok) return null;
        
        const { dataStreams = [] } = await dataStreamsResponse.json();
        const webStream = dataStreams.find((stream: DataStream) => stream.type === 'WEB_DATA_STREAM');
        
        return {
          id: propertyId,
          name: property.displayName,
          domain: (webStream?.webStreamData?.defaultUri || property.displayName)
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
        };
      }) || []);
    }) || [];

    const properties = (await Promise.all(propertiesPromises))
      .flat()
      .filter(Boolean);

    return properties;
  } catch (error) {
    console.error('Error fetching GA properties:', error);
    return [];
  }
}

export function getGoogleAuthUrl() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/ga-callback`);
  const scope = encodeURIComponent('https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.email');
  
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

export async function fetchVisitorData(accessToken: string, propertyId: string, startTime: Date, endTime: Date) {
  try {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{
            startDate: startTime.toISOString().split('T')[0],
            endDate: endTime.toISOString().split('T')[0],
          }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'totalRevenue' }
          ],
          dimensions: [
            { name: 'date' }
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GA Data API Error: ${await response.text()}`);
    }

    const data: RunReportResponse = await response.json();
    
    // Create array of daily slots for the date range
    const dayCount = 7;
    const now = new Date();
    const dailyData = Array.from({ length: dayCount }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (dayCount - 1) + i); // Start 6 days ago
      date.setHours(0, 0, 0, 0);
      
      const isToday = date.toDateString() === now.toDateString();
      return {
        time: date.toISOString(),
        label: isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        visitors: 0,
        revenue: 0
      };
    });

    let totalRevenue = 0;
    data.rows?.forEach(row => {
      const dateStr = row.dimensionValues[0].value; // Format: YYYYMMDD from GA4
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
      const day = parseInt(dateStr.substring(6, 8));
      const rowDate = new Date(year, month, day);
      rowDate.setHours(0, 0, 0, 0);
      
      const visitors = parseInt(row.metricValues[0].value);
      const revenue = parseFloat(row.metricValues[1]?.value || '0');
      
      // Find matching day in our data array
      const dayIndex = dailyData.findIndex(d => {
        const dataDate = new Date(d.time);
        return dataDate.getTime() === rowDate.getTime();
      });
      
      if (dayIndex !== -1) {
        dailyData[dayIndex].visitors = visitors;
        dailyData[dayIndex].revenue = revenue;
        totalRevenue += revenue;
      }
    });

    return {
      totalVisitors: dailyData.reduce((sum, day) => sum + day.visitors, 0),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      hourlyData: dailyData
    };
  } catch (error) {
    console.error('Error fetching visitor data:', error);
    return { totalVisitors: 0, totalRevenue: 0, hourlyData: [] };
  }
}
