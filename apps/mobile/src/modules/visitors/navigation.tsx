import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VisitorScreen } from './screens/VisitorScreen';

const Stack = createNativeStackNavigator();

export default function VisitorNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="VisitorList" component={VisitorScreen} options={{ title: 'Visitors' }} />
    </Stack.Navigator>
  );
}
