import { Router, Request, Response } from 'express';
import { authenticate } from "../routes/middleware";
import { getProcessors, getProcessor, insertProcessor, updateProcessor } from "../routes/processor";

// Assign router to the express.Router() instance
const router: Router = Router();

//OpenPay Admin Routes

//get all processors
router.get('/', (req: Request, res: Response) => {
    getProcessors(req, res);
});

//get processor by Name
router.get('/:name', (req: Request, res: Response) => {
    getProcessor(req, res);
});

//register new processor
router.post('/', (req: Request, res: Response) => {
    insertProcessor(req, res);
});

//update processor info
router.patch('/:name', (req: Request, res: Response) => {
    updateProcessor(req, res);
});

export const ProcessorsController: Router = router;
