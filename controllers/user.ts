import { Router, Request, Response } from 'express';
import { authenticate } from "../routes/middleware";
import {
  getUsers, getUser, createUser, login, registerUserAndBusiness, updateUser, deleteUser, resetPassword,
  verifyUserEmail, uploadUserFile
} from "../routes/user";

// Assign router to the express.Router() instance
const router: Router = Router();

//create User

router.post('/', (req: Request, res: Response) => {
    createUser(req, res);
});

//create Busines with Admin User

router.post('/business', (req: Request, res: Response) => {
    registerUserAndBusiness(req, res);
});

//Login to Omnipagos

router.post('/login', (req: Request, res: Response) => {
    login(req, res);
});

router.get('/verify/:email/:id', (req: Request, res: Response) => {
  verifyUserEmail(req, res);
});

router.post('/upload/:id', (req: any, res: Response) => {
  uploadUserFile(req,res);
})

// Middleware to be used in production...

/*router.use('/', (req: Request, res: Response, next: any)=>{
    authenticate(req,res,next);
});*/

//get users (business admin)

router.get('/', (req: Request, res: Response) => {
    getUsers(req, res);
});

//get user by id

router.get('/:id', (req: Request, res: Response) => {
    getUser(req, res);
});

//edit user

router.patch('/:id', (req: Request, res: Response) => {
    updateUser(req, res);
});

//delete user

router.delete('/:id', (req: Request, res: Response) => {
    deleteUser(req, res);
});

//change user's password

router.patch('/:id/pwd', (req: Request, res: Response) => {
    resetPassword(req, res);
});




export const UsersController: Router = router;
