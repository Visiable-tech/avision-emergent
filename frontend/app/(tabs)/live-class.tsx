/**
 * The Live Class tab now directly renders the Live Courses catalog
 * (previously it was an intermediate screen that redirected users into
 * `/live-courses`). Per user request the intermediate screen is removed
 * and the tab lands users straight on the new catalog design.
 */
import { Redirect } from 'expo-router';

export default function LiveClassTab() {
  return <Redirect href="/live-courses" />;
}
