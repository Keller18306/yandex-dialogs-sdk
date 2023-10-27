import { EventEmitter } from 'events';

import { IApiRequest } from './api/request';
import { IApiResponse } from './api/response';
import { CommandCallback, CommandDeclaration } from './command/command';
import { ALICE_PROTOCOL_VERSION } from './constants';
import { IContext } from './context';
import debug from './debug';
import { IImagesApi, IImagesApiConfig, ImagesApi } from './imagesApi';
import { Middleware } from './middleware/middleware';
import { IWebhookServer, WebhookServer } from './server/webhookServer';
import { InMemorySessionStorage } from './session/inMemorySessionStorage';
import { sessionMiddleware } from './session/sessionMiddleware';

import { ISessionStorage } from './session/session';
import { MainStage } from './stage/mainScene';
import { IScene } from './stage/scene';
import { IStageContext } from './stage/stageContext';

export interface IAliceConfig extends IImagesApiConfig {
  sessionStorage?: ISessionStorage;
}

export interface IAlice {
  readonly imagesApi: IImagesApi;
  handleRequest(data: IApiRequest): Promise<IApiResponse>;
  use(middleware: Middleware): void;
  listen(port: number, webhookUrl: string, options: object): IWebhookServer;
}

export class Alice implements IAlice {
  private readonly _config: IAliceConfig;
  private readonly _middlewares: Middleware[];
  private readonly _imagesApi: IImagesApi;
  private readonly _mainStage: MainStage;
  private readonly _sessionStorage: ISessionStorage;
  private _eventEmitter: EventEmitter;

  constructor(config: IAliceConfig = {}) {
    this._eventEmitter = new EventEmitter();
    this._config = config;
    this.handleRequest = this.handleRequest.bind(this);

    this._middlewares = [];
    this._imagesApi = new ImagesApi(this._config);
    this._mainStage = new MainStage();

    this._sessionStorage =
      config.sessionStorage || new InMemorySessionStorage();
    this.use(sessionMiddleware(this._sessionStorage));
  }

  private _buildContext(request: IApiRequest): IContext {
    return {
      data: request,
      message: request.request.command,
      originalUtterance: request.request.original_utterance,
      sessionId: request.session.session_id,
      messageId: request.session.message_id,
      userId: request.session.user_id,
      user: request.session.user,
      application: request.session.application,
      payload: request.request.payload,
      nlu: request.request.nlu,
    };
  }

  private async _runMiddlewares(context: IContext): Promise<IContext> {
    const middlewares = Array.from(this._middlewares);
    // mainStage middleware should always be the latest one
    middlewares.push(this._mainStage.middleware);
    if (middlewares.length === 0) {
      return context;
    }

    let index = 0;
    const next = async (middlewareContext: IContext): Promise<IContext> => {
      const middleware = middlewares[index];
      index++;
      return middleware(
        middlewareContext,
        index >= middlewares.length ? null : next,
      );
    };
    return next(context);
  }

  get imagesApi(): IImagesApi {
    return this._imagesApi;
  }

  public async handleRequest(data: IApiRequest): Promise<IApiResponse> {
    if (data.version !== ALICE_PROTOCOL_VERSION) {
      throw new Error('Unknown protocol version');
    }
    debug(`incoming request: ${data.request.command}`);
    const context = this._buildContext(data);
    // trigger request event
    this._eventEmitter.emit('request', context);

    const newContext = await this._runMiddlewares(context);
    if (!newContext.response) {
      throw new Error(
        'No response for request ' +
          `"${context.data.request.command}"` +
          '. Try add command for it or add default command.' +
          '${context.response} not found. Check out your middlewares',
      );
    }

    // trigger response event
    this._eventEmitter.emit('response', newContext);

    debug(`outcoming result: ${newContext.response.text}`);
    return {
      response: newContext.response,
      session: {
        message_id: data.session.message_id,
        session_id: data.session.session_id,
        user_id: data.session.user_id,
      },
      version: ALICE_PROTOCOL_VERSION,
    };
  }

  public listen(
    port: number = 80,
    webhookUrl: string = '/',
    options: object = {},
  ): WebhookServer {
    const server = new WebhookServer({
      port: port,
      webhookUrl: webhookUrl,
      options: options,
      handleRequest: this.handleRequest,
    });
    server.start();
    return server;
  }

  public use(middleware: Middleware): void {
    this._middlewares.push(middleware);
  }

  public command(
    declaration: CommandDeclaration<IStageContext>,
    callback: CommandCallback<IStageContext>,
  ): void {
    this._mainStage.scene.command(declaration, callback);
  }

  public any(callback: CommandCallback<IStageContext>): void {
    this._mainStage.scene.any(callback);
  }

  public registerScene(scene: IScene): void {
    this._mainStage.stage.addScene(scene);
  }

  public on(
    type: 'response' | 'request',
    callback: (context: IContext) => any,
  ): void {
    this._eventEmitter.addListener(type, callback);
  }
}
