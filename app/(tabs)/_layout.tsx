import { type Href, Tabs, useGlobalSearchParams } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import ConcreteIcon from '@/assets/icons/concrete.svg';
import ControlIcon from '@/assets/icons/control.svg';
import DocsIcon from '@/assets/icons/docs.svg';
import LevelsIcon from '@/assets/icons/levels.svg';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { projectId } = useGlobalSearchParams<{ projectId?: string }>();

  const indexHref: Href = projectId ? `/?projectId=${projectId}` : '/';
  const programsHref: Href = projectId ? `/programs?projectId=${projectId}` : '/programs';
  const levelsHref: Href = projectId ? `/levels?projectId=${projectId}` : '/levels';
  const concreteHref: Href = projectId ? `/concrete?projectId=${projectId}` : '/concrete';
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
        <Tabs.Screen
        name="index"
        options={{
          title: 'Controls',
          href: indexHref,
          tabBarIcon: ({ color }) => <ControlIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: 'Levels',
          href: levelsHref,
          tabBarIcon: ({ color }) => <LevelsIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="concrete"
        options={{
          title: 'Concrete',
          href: concreteHref,
          tabBarIcon: ({ color }) => <ConcreteIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Plans',
          href: programsHref,
          tabBarIcon: ({ color }) => <DocsIcon width={28} height={28} fill={color} />,
        }}
      />
      
    </Tabs>
  );
}
