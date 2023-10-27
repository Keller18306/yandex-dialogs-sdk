import { IApiRequestNlu } from './nlu';

export interface IApiRequestMeta {
  locale: string;
  timezone: string;
  client_id: string;
}

export interface IApiRequestBody {
  command: string;
  original_utterance: string;
  type: 'SimpleUtterance' | 'ButtonPressed';
  markup?: {
    dangerous_context?: true;
  };
  payload?: object;
  nlu?: IApiRequestNlu;
}

export interface IApiRequestUser {
  user_id: string;
  access_token: string;
}

export interface IApiRequestApplication {
  application_id: string;
}

export interface IApiRequesSession {
  session_id: string;
  message_id: number;
  skill_id: string;
  /**
   * @deprecated The method should not be used
   */
  user_id: string;
  user?: IApiRequestUser;
  application: IApiRequestApplication;
  new: boolean;
}

export interface IApiRequest {
  meta: IApiRequestMeta;
  request: IApiRequestBody;
  session: IApiRequesSession;
  // TODO state
  version: string;
}
