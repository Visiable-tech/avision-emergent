import EntityScreen from '@/src/admin/EntityScreen';
import { SPECS } from '@/src/admin/entitySpecs';

/** Convenience factory — used by every admin CMS route */
export function makeEntityScreen(entity: keyof typeof SPECS) {
  return function AdminEntityRoute() {
    const spec = SPECS[entity];
    return <EntityScreen entity={String(entity)} {...spec} />;
  };
}
