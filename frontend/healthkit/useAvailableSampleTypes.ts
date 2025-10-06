import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { HealthKitModule } from './HealthKitModule';
import { sampleTypes, SampleType } from './sampleTypes';

interface UseAvailableSampleTypesParams {
  startDate: DateTime;
  endDate: DateTime;
}

export function useAvailableSampleTypes({
  startDate,
  endDate,
}: UseAvailableSampleTypesParams) {
  const [availableSampleTypes, setAvailableSampleTypes] = useState<SampleType[]>([]);
  const [unavailableSampleTypes, setUnavailableSampleTypes] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkData = async () => {
      try {
        const foundData: SampleType[] = [];
        const noData: SampleType[] = [];

        for (const type of sampleTypes) {
          const params = {
            sample_type: type,
            start_date: startDate.toISO()!, 
            end_date: endDate.toISO()!,
            interval: 'day',
          };

          try {
            const hkResults = await HealthKitModule.query(params);
            const hasData = hkResults && hkResults.length > 0;
            
            if (hasData) {
              foundData.push(type);
            } else {
              noData.push(type);
            }
          } catch (error) {
            console.error(`Error querying sample type [${type}]`, error);
            noData.push(type);
          }
        }

        setAvailableSampleTypes(foundData);
        setUnavailableSampleTypes(noData);
      } catch (error) {
        console.error('Error fetching available sample types:', error);
      } finally {
        setLoading(false);
      }
    };

    void checkData();
  }, [sampleTypes, startDate, endDate]);

  return {
    loading,
    availableSampleTypes,
    unavailableSampleTypes,
  };
}
