import { queryHealthKit } from "../healthkit/queryHealthKit";
import { HealthKitToolCallParameters } from "../healthkit/HealthKitModule";
import { v4 as uuidv4 } from 'uuid';
import { ToolCall, ChatMessage, ToolResponse } from "../context/ChatContext";

const formatToolResponse = (tool_call: ToolCall, res: unknown): ToolResponse => {
  const responseMessage = typeof res === 'string' ? res : JSON.stringify(res);
  return {
    type: 'message',
    role: 'tool',
    content: responseMessage,
    tool_call_id: tool_call.id,
    id: uuidv4(),
  };
}

export async function handleToolCall(
  tool_call: ToolCall,
  should_respond: boolean,
  addNewMessage: (message: ChatMessage) => void,
  id: string
): Promise<ToolResponse | undefined> {
  console.log("Handling tool call:", tool_call);

  const args: HealthKitToolCallParameters = JSON.parse(
    tool_call.function.arguments
  ) as HealthKitToolCallParameters;

  switch (tool_call.function.name) {
    case "query_health_data": {
      console.log("Querying health data with args:", args);
      if (args.show_user) {
        addNewMessage({ type: 'visualization', role: 'agent', content: JSON.stringify(args), id: id});
      }
      if (should_respond) {
        const data = await queryHealthKit(args);
        console.log("\n\n  Query health data response:", data, "\n\n");
        return formatToolResponse(tool_call, {...args, data});
      }
      break;
    }
    case "plan-widget": {
      console.log("Plan widget args:", args);
      
      let response: ToolResponse | undefined;
      if (should_respond) {
        response = formatToolResponse(tool_call, {...args, data: 'success'});
        console.log("Plan widget response:", response);
      }

      if (response) {
        addNewMessage({ 
          type: 'plan-widget', 
          role: 'agent', 
          content: JSON.stringify({ args: JSON.stringify(args), data: response }), 
          id: id
        });
      }
      return response;
    }
    case "generate_plan":
      break
    default:
      console.log("Tool not found");
  }
}
