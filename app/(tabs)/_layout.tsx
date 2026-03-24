import { type Href, Tabs, useGlobalSearchParams } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import ConcreteIcon from '@/assets/icons/concrete.svg';
import ControlIcon from '@/assets/icons/control.svg';
import DocsIcon from '@/assets/icons/docs.svg';
import LevelsIcon from '@/assets/icons/levels.svg';
import SettingsIcon from '@/assets/icons/settings.svg';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { projectId } = useGlobalSearchParams<{ projectId?: string }>();

  const indexHref: Href = projectId ? `/?projectId=${projectId}` : '/';
  const programsHref: Href = projectId ? `/programs?projectId=${projectId}` : '/programs';
  const levelsHref: Href = projectId ? `/levels?projectId=${projectId}` : '/levels';
  const concreteHref: Href = projectId ? `/concrete?projectId=${projectId}` : '/concrete';
  const settingsHref: Href = projectId ? `/settings?projectId=${projectId}` : '/settings';
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
          title: 'בקרות',
          href: indexHref,
          tabBarIcon: ({ color }) => <ControlIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: 'מפלסים',
          href: levelsHref,
          tabBarIcon: ({ color }) => <LevelsIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="concrete"
        options={{
          title: 'בטון',
          href: null,
          tabBarIcon: ({ color }) => <ConcreteIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'תוכניות',
          href: programsHref,
          tabBarIcon: ({ color }) => <DocsIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          href: settingsHref,
          tabBarIcon: ({ color }) => <SettingsIcon width={28} height={28} fill={color} />,
        }}
      />

    </Tabs>
  );
}
