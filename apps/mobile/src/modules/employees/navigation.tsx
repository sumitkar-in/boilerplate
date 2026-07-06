import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmployeesScreen } from './screens/EmployeesScreen';
import { EmployeeFormScreen } from './screens/EmployeeFormScreen';

const Stack = createNativeStackNavigator();

export default function EmployeesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} options={{ title: 'Employee' }} />
    </Stack.Navigator>
  );
}
