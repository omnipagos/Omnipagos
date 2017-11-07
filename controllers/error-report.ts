import { Router, Request, Response } from 'express';
import { ErrorReport } from "../db/models/error-report"
import { onError } from "../routes/onError";
// Assign router to the express.Router() instance
const router: Router = Router();

router.post('/', (req: Request, res: Response) => {

  let errorReport = new ErrorReport(req.body);
  errorReport.save().then(error=>{
    res.json(error);
  }).catch(error => onError(res, "error al insertar error", error));


});

export const ErrorReportController: Router = router;
