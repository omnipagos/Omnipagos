import { Router, Request, Response } from 'express';
import { authenticate } from "../routes/middleware";
import {
  getBusinesses, getBusiness, createBusiness, addUserToBusiness, updateProcessors,
  getBusinessesNames
} from "../routes/business";

const router: Router = Router();

// Middleware to be used in production...

// router.use('/', (req: Request, res: Response, next: any)=>{
//     authenticate(req,res,next);
// });

//get all Businesses (OmniPagos Admin)
router.get('/', (req: Request, res: Response) => {
    getBusinesses(req, res);
});

//get all Businesses Names (Verification)
router.get('/names/:name', (req: Request, res: Response) => {
  getBusinessesNames(req, res);
});


//get one Business by ID
router.get('/:id', (req: Request, res: Response) => {
    getBusiness(req, res);
});

//create a Business
router.post('/', (req: Request, res: Response) => {
    createBusiness(req, res);
});

//add user to existing business
router.post('/:id/user', (req: Request, res: Response) => {
    addUserToBusiness(req, res);
});

//edit business' processors (activated/deactivated route)
router.patch('/:id/processors', (req: Request, res: Response) => {
    updateProcessors(req, res);
});


export const BusinessController: Router = router;
