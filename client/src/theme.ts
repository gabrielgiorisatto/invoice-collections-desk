import type { ThemeConfig } from 'antd'

export const deskTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563EB',
    colorInfo: '#1D68F4',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorText: '#111827',
    colorTextSecondary: '#6B7280',
    colorBorder: '#E5E7EB',
    colorBorderSecondary: '#E5E7EB',
    colorBgLayout: '#F9FAFB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorFillAlter: '#F9FAFB',
    borderRadius: 8,
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: 14,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F9FAFB',
      triggerBg: '#FFFFFF',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#EFF6FF',
      itemSelectedColor: '#2563EB',
      itemHoverBg: '#F3F4F6',
      itemBorderRadius: 6,
      activeBarBorderWidth: 0,
    },
    Table: {
      headerBg: '#F9FAFB',
      rowHoverBg: '#F3F4F6',
      borderColor: '#E5E7EB',
    },
    Card: {
      paddingLG: 20,
    },
    Tag: {
      borderRadiusSM: 4,
    },
  },
}
