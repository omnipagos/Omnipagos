import { Router, Request, Response } from 'express';
import {
  getTransaction,
  getTransactionsByClient,
  getTransactionsByBusiness,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAllTransactionsByBusiness,
  handleOpenPayWebhook,
  handleConektaWebhook
} from "../routes/transaction";

const router: Router = Router();

// Middleware to be used in production...

// router.use('/', (req: Request, res: Response, next: any)=>{
//     authenticate(req,res,next);
// });

//get transaction by ID

router.get('/:id', (req: Request, res: Response) => {
    getTransaction(req, res);
});

//get transactions by client ID

router.get('/client/:id', (req: Request, res: Response) => {
    getTransactionsByClient(req, res);
});

//get transaction by business, processor and externalId

router.get('/business/:processorId/:id/:externalId', (req: Request, res: Response) => {
    getTransactionsByBusiness(req, res);
});


router.get('/business/:businessId', (req : Request, res : Response) => {
    getAllTransactionsByBusiness(req, res);
})

//create transaction

router.post('/', (req: Request, res: Response) => {
    createTransaction(req, res);
});

//edit information about transaction

router.patch('/:id', (req: Request, res: Response) => {
    updateTransaction(req, res);
});

//delete a transaction

router.delete('/:id', (req: Request, res: Response) => {
    deleteTransaction(req, res);
});


router.post('/openpay', (req : Request, res: Response) => {
    handleOpenPayWebhook(req, res);
});

router.post('/conekta', (req : Request, res: Response) => {
  handleConektaWebhook(req, res);
});


export const TransactionsController: Router = router;
