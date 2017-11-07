import { Router, Request, Response } from 'express';
import { getClients, getClient, getClientByEmail, createClient, updateClient, deleteClient, unlinkClient} from "../routes/client";
import { authenticate } from "../routes/middleware";

// Assign router to the express.Router() instance
const router: Router = Router();

// get ALL Clients (OmniPagos Admin)
router.get('/', (req: Request, res: Response) => {
    getClients(req, res);
});

// Middleware to be used in production...
/*router.use('/', (req: Request, res: Response, next: any)=>{
    authenticate(req,res,next);
});*/

//get client by ID
router.get('/:id', (req: Request, res: Response) => {
    getClient(req, res);
});

//get client by email (temp)
router.post('/login', (req: Request, res: Response) => {
    getClientByEmail(req, res);
});

//create Client
router.post('/', (req: Request, res: Response) => {
    createClient(req, res);
});

//update Client
router.patch('/:id', (req: Request, res: Response) => {
    updateClient(req, res);
});

//delete Client
router.delete('/:id', (req: Request, res: Response) => {
    deleteClient(req, res);
});

//unlink Client from business
router.delete('/:id/business/:businessId', (req: Request, res: Response) => {
    unlinkClient(req, res);
});

export const ClientsController: Router = router;
