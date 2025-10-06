import { HealthKitData, HealthKitToolCallParameters, HealthKitParameters, QuantityDataPoint, SleepDataPoint, WorkoutDataPoint } from "./HealthKitModule";

// Formats HealthKit data into a human-readable summary string.
export const formatHealthKitSummary = (
    parameters: HealthKitToolCallParameters, 
    parsedParameters: HealthKitParameters, 
    data: HealthKitData[]
): string => {
    const { sample_type, aggregation_level, reference_date } = parameters;
    const dataSourceDescription = getDataSourceDescription(sample_type);
    const summaryStats = computeSummaryStats(data);
    const formattedSamples = formatSamples(data);

    let summaryText = `
Results from executing function "query" with arguments:
* sample_type=${sample_type}${aggregation_level? `\n* start_date=${aggregation_level}` : ""}${reference_date? `\n* end_date=${reference_date}` : ""}

# Data Source Description
${dataSourceDescription}

# Summary Statistics
${summaryStats}
`
    if (sample_type !== "workout") {
        summaryText += `\n# Samples
${formattedSamples}
    `;
    }
    return summaryText;
};

export const getDataSourceDescription = (sampleType: string): string => {
    const descriptions: Record<string, string> = {
        activeEnergyBurned: "This is an estimate of energy burned over and above your Resting Energy use (see Resting Energy). Active energy includes activity such as walking slowly, pushing your wheelchair, and household chores, as well as exercise such as biking and dancing.",
        appleExerciseTime: "Every full minute of movement equal to or exceeding the intensity of a brisk walk for you counts towards your Exercise minutes.",
        appleStandTime: "Stand minutes are the minutes in each hour that you're standing and moving. Looking at your Stand minutes over time can help you understand how active or sedentary you are. Apple Watch automatically tracks and logs Stand minutes in Health.",
        basalEnergyBurned: "This is an estimate of the energy your body uses each day while minimally active. Additional physical activity requires more energy over and above Resting Energy (see Active Energy).",
        distanceWalkingRunning: "This is an estimate of the distance you've walked or run. It's calculated using the steps you've taken and the distance of your stride.",
        flightsClimbed: "A flight of stairs is counted as approximately 10 feet (3 meters) of elevation gain (approximately 16 steps).",
        heartRate: "Your heart beats approximately 100,000 times per day, accelerating and slowing through periods of rest and exertion. Your heart rate refers to how many times your heart beats per minute and can be an indicator of your cardiovascular health.",
        heartRateVariabilitySdnn: "Heart Rate Variability (HRV) is a measure of the variation in the time interval between heart beats. Apple Watch calculates HRV by using the standard deviation of beat-to-beat measurements.",
        restingHeartRate: "Your resting heart rate is the average heart beats per minute measured when you've been inactive or relaxed for several minutes. A lower resting heart rate typically indicates better cardiovascular fitness.",
        sleepAnalysis: "Sleep provides insight into your sleep habits. Sleep trackers and monitors can help you determine the amount of time you are in bed and asleep.",
        stepCount: "Step count is the number of steps you take throughout the day. Pedometers and digital activity trackers can help you determine your step count.",
        walkingHeartRateAverage: "Your walking heart rate is the average heart beats per minute measured by your Apple Watch during walks at a steady pace throughout the day.",
        workout: "Workouts can be logged manually or automatically by your phone or watch. Each workout is logged with a start and end time, type of workout, and duration."
    };
    
    return descriptions[sampleType] ?? "Description not available.";
};

export const computeSummaryStats = (data: HealthKitData[]): string => {
    if (!data || data.length === 0) return "No data available for the specified period.";

    if ("value" in data[0]) {
        // Quantity data
        const values = data.map((d) => (d as QuantityDataPoint).value);
        const total = values.reduce((sum, val) => sum + val, 0);
        const avg = total / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return `Total Sum: ${total}, Average: ${avg.toFixed(2)}, Min: ${min}, Max: ${max}`;
    } else if ("workoutType" in data[0]) {
        // Workout data
        const workoutData = data as WorkoutDataPoint[];
        return workoutData
            .map(
                (d) =>
                    `Workout Type: ${d.workoutType}, Total Workouts: ${d.totalWorkouts}, Total Duration: ${d.totalDurationHours.toFixed(
                        2
                    )} hours, Average Duration: ${d.averageDurationMinutes.toFixed(2)} minutes`
            )
            .join("\n");
    } else if ("sleepDuration" in data[0]) {
        // Sleep data
        const sleepData = data as SleepDataPoint[];
        const totalSleep = sleepData.reduce((sum, d) => sum + (d.sleepDuration || 0), 0);
        const totalInBed = sleepData.reduce((sum, d) => sum + (d.inBedDuration || 0), 0);
        const avgSleep = totalSleep / sleepData.length;
        const avgInBed = totalInBed / sleepData.length;
        return `Total Sleep: ${(totalSleep / 3600).toFixed(2)} hours, Total In Bed: ${(totalInBed / 3600).toFixed(
            2
        )} hours, Average Sleep: ${(avgSleep / 3600).toFixed(2)} hours, Average In Bed: ${(avgInBed / 3600).toFixed(
            2
        )} hours`;
    }
    return "No summary statistics available.";
};

export const formatSamples = (data: HealthKitData[]): string => {
    if (!data || data.length === 0) return "No samples available.";
    return data
        .map((d) => {
            if ("value" in d) {
                // Quantity data point
                return `Date: ${d.startDate} - ${d.endDate}, Value: ${d.value} ${d.unit}, Sources: ${d.sources.join(
                    ", "
                )}`;
            } else if ("workoutType" in d) {
                // Workout data point
                return `Workout: ${d.workoutType}, Total Duration: ${d.totalDurationMinutes} minutes, Sources: ${d.sources.join(
                    ", "
                )}`;
            } else if ("sleepDuration" in d) {
                // Sleep data point
                return `Date: ${d.startDate} - ${d.endDate}, Sleep Duration: ${d.sleepDurationStr}, In Bed Duration: ${d.inBedDurationStr}, Sources: ${d.sources.join(
                    ", "
                )}`;
            }
            return "Unknown data point format.";
        })
        .join("\n");
};
