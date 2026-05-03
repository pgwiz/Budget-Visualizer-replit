import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import sectorsRouter from "./sectors";
import cyclesRouter from "./cycles";
import allocationsRouter from "./allocations";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import productsRouter from "./products";
import purchaseOrdersRouter from "./purchase-orders";
import sectorControlsRouter from "./sector-controls";
import approvalLimitsRouter from "./approval-limits";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(sectorsRouter);
router.use(cyclesRouter);
router.use(allocationsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(productsRouter);
router.use(purchaseOrdersRouter);
router.use(sectorControlsRouter);
router.use(approvalLimitsRouter);

export default router;
