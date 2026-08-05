import { attemptViolation } from '@/lib/attemptProxy';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return attemptViolation(req, id);
}
