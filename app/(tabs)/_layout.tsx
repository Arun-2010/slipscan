import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { History, House, PlusCircle, ScanLine, Settings } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Scan',
          tabBarAccessibilityLabel: 'Scan a bill',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <ScanLine color={colors.white} size={26} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/scan');
          },
        }}
      />
      <Tabs.Screen
        name="add"
        options={{ title: 'Add', tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.card,
  },
});
