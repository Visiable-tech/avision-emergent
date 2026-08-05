import { attemptStart } from '@/lib/attemptProxy';
export const POST = (req: Request) => attemptStart(req);
