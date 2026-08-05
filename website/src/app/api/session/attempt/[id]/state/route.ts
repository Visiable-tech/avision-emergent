import { attemptState, attemptSubmit, attemptViolation } from '@/lib/attemptProxy';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return attemptState(req, id);
}
