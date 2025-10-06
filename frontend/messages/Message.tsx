import React from "react";
import { Pressable } from "react-native";
import MarkdownMessage from "./MarkdownMessage";
import LoadingMessage from "./LoadingMessage";
import VisualizationMessage from "./VisualizationMessage";
import PlanWidgetMessage from "./PlanWidgetMessage";
import PlainTextMessage from "./PlainTextMessage";
import { WeeklyPlan } from "../context/plan/WeeklyPlan";
import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import { SampleType } from '../healthkit/sampleTypes';

type AggregationLevel = 'day' | 'week' | 'month';

interface MessageProps {
  type: string;
  content: string;
  role: string;
  onLongPress?: () => void;
}

interface VisualizationContent {
  sample_type: string;
  aggregation_level: string;
  reference_date: string;
}

const parseDate = (date: string): DateTime | undefined => {
  const reference = new Date();
  const parsedDate = chrono.parseDate(date, reference);

  if (!parsedDate) {
    console.warn(`Could not parse date: ${date}`);
    return undefined;
  }

  return DateTime.fromJSDate(parsedDate);
};

const Message = ({ type, content, role, onLongPress }: MessageProps) => {
  const renderMessageContent = () => {
    switch (type) {
      case "stream":
        return <MarkdownMessage content={content} role={role} />;
      case "acknowledgement":
        return <LoadingMessage />;
      case "message":
        if (role === "assistant") {
          return <MarkdownMessage content={content} role={role} />;
        } else {
          return <PlainTextMessage content={content} role={role} />;
        }
      case "visualization": {

        let jsonContent: VisualizationContent;
        try {
          jsonContent = JSON.parse(content) as VisualizationContent;
        } catch (error) {
          console.error("Invalid JSON content:", error);
          return <MarkdownMessage content={content} role={role} />;
        }

        const parsedDate = jsonContent.reference_date ? parseDate(jsonContent.reference_date) : undefined;
        const aggregationLevel = jsonContent.aggregation_level ? jsonContent.aggregation_level as AggregationLevel : undefined;

        return (
          <VisualizationMessage
            sampleType={jsonContent.sample_type as SampleType}
            {...(aggregationLevel !== undefined && { aggregationLevel: aggregationLevel})}
            {...(parsedDate !== undefined && { initialReferenceDate: parsedDate })}
          />
        );
      }
      case "plan-widget": {
        let jsonContent: { plan: WeeklyPlan };

        try {
          jsonContent = JSON.parse(content) as { plan: WeeklyPlan };
        } catch (error) {
          console.error("Invalid JSON content:", error);
          return <MarkdownMessage content={content} role={role} />;
        }

        return <PlanWidgetMessage plan={jsonContent.plan} />;
      }
      default:
        return <MarkdownMessage content={"Error parsing message: unknown message type"} role={role} />;
    }
  };

  return (
    <Pressable onLongPress={onLongPress}>
      {renderMessageContent()}
    </Pressable>
  );
};

export default Message;
