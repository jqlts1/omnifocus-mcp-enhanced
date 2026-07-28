import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';

export type ToolHandlerExtra = RequestHandlerExtra<
  ServerRequest,
  ServerNotification
>;
