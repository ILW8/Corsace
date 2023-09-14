/* eslint-disable*/
import "@koa/router";
import { DefaultContext, DefaultState, ResponseBody } from "koa";

declare class Router<StateT = DefaultState, ContextT = DefaultContext> {
    get<T = {}, U = {}>(
        name: string,
        path: string | RegExp,
        ...middleware: Array<Router.Middleware<StateT & T, ContextT & U>>
    ): Router<StateT, ContextT>;
    get<T = {}, U = ResponseBody>(
        path: string | RegExp | Array<string | RegExp>,
        ...middleware: Array<Router.Middleware<StateT & T, ContextT & U>>
    ): Router<StateT, ContextT>;
}