import * as chrono from 'chrono-node';
import captureError from "../utils/errorHandling";
import { HealthKitModule, HealthKitParameters, HealthKitToolCallParameters } from './HealthKitModule';
import { formatHealthKitSummary } from './formatHealthKitSummary';
import { DateTime } from 'luxon';

const buildQueryParams = (parameters: HealthKitToolCallParameters): Required<HealthKitParameters> => {
  try {
    const { sample_type, reference_date, aggregation_level } = parameters;

    // Parse natural language dates with chrono-node
    let parsedDate: DateTime;
    if (DateTime.fromISO(reference_date).isValid) {
      parsedDate = DateTime.fromISO(reference_date);
    } else {
      const chronoParsed = chrono.parseDate(reference_date, new Date());
      if (!chronoParsed) {
        throw new Error(`Invalid reference_date: ${reference_date}`);
      }
      parsedDate = DateTime.fromJSDate(chronoParsed);
    }

    if (parsedDate > DateTime.now()) {
      parsedDate = DateTime.now();
    }

    if (aggregation_level === 'day') {
      return {
        sample_type: sample_type,
        start_date: parsedDate.startOf('day').toISO() ?? "",
        end_date: parsedDate.endOf('day').toISO() ?? "",
        interval: sample_type === 'sleepAnalysis' ? 'day' : 'hour',
      };
    } else if (aggregation_level === 'week') {
      const startOfWeek =
        parsedDate.weekdayShort === 'Sun'
          ? parsedDate.startOf('day')
          : parsedDate.startOf('week').minus({ days: 1 }).startOf('day');
      const endOfWeek = startOfWeek.plus({ days: 6 }).endOf('day');

      return {
        sample_type: sample_type,
        start_date: startOfWeek.toISO() ?? "",
        end_date: endOfWeek.toISO() ?? "",
        interval: 'day',
      };
    } else { // month
      return {
        sample_type: sample_type,
        start_date: parsedDate.startOf('month').toISO() ?? "",
        end_date: parsedDate.endOf('month').toISO() ?? "",
        interval: 'day',
      };
    }
  } catch (error) {
    captureError(error, 'Error building query params for HealthKit');

    return {
      sample_type: parameters.sample_type,
      start_date: DateTime.now().toISO() ?? "",
      end_date: DateTime.now().toISO() ?? "",
      interval: 'day',
    };
  }
};


export const queryHealthKit = async (parameters: HealthKitToolCallParameters): Promise<string> => {
  console.log('Querying HealthKit with parameters: ', parameters);
  const parsedParameters = buildQueryParams(parameters);
  console.log('Parsed parameters: ', parsedParameters);
  const data = await HealthKitModule.query(parsedParameters);
  console.log('Data: ', data);
  return formatHealthKitSummary(parameters, parsedParameters, data);
};
