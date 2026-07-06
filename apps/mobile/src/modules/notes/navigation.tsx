import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotesScreen } from './screens/NotesScreen';
import { NoteFormScreen } from './screens/NoteFormScreen';

// This module's own stack, lazy-loaded by
// apps/mobile/src/core/module-loader.ts — only fetched once the tenant has
// "notes" enabled. See: skills/frontend-module/SKILL.md
const Stack = createNativeStackNavigator();

export default function NotesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="NoteForm" component={NoteFormScreen} options={{ title: 'Note' }} />
    </Stack.Navigator>
  );
}
