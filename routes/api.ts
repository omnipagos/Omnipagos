import { Application } from 'express';
import { ClientsController } from "../controllers/client";
import { UsersController } from "../controllers/user";
import { BusinessController } from "../controllers/business";
import { TransactionsController } from "../controllers/transaction";
import { ProcessorsController } from "../controllers/processor";
import { FilesController } from "../controllers/files";
import { ErrorReportController } from "../controllers/error-report";
const path = require('path');
const express = require('express');

//This file relates the possible api routes prefixes to their corresponding logic controller.
export function initApi(app: Application) {

    //Users

    app.use('/api/user', UsersController);

    //Clients

    app.use('/api/client', ClientsController);

    //Businesses

    app.use('/api/business', BusinessController);

    //Transactions

    app.use('/api/transaction', TransactionsController);

    //Processors

    app.use('/api/processors', ProcessorsController);


    app.use('/api/files', FilesController);


    app.use('/api/error', ErrorReportController);

}
