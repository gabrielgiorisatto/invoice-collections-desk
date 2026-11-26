import type { ThemeConfig } from 'antd'

export const deskTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0B1F33',
    colorInfo: '#123A56',
    colorSuccess: '#1B7F4A',
    colorWarning: '#B45309',
    colorError: '#B91C1C',
    colorText: '#0F172A',
    colorTextSecondary: '#64748B',
    colorBorder: '#D8DEE6',
    colorBorderSecondary: '#D8DEE6',
    colorBgLayout: '#F4F6F8',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorFillAlter: '#F4F6F8',
    borderRadius: 4,
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: 14,
    controlHeight: 36,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 56,
      headerPadding: '0 24px',
      bodyBg: '#F4F6F8',
    },
    Table: {
      headerBg: '#F4F6F8',
      rowHoverBg: '#EEF2F6',
      borderColor: '#D8DEE6',
    },
    Card: {
      headerFontSize: 15,
      paddingLG: 16,
    },
    Tag: {
      defaultBg: '#EEF2F6',
      defaultColor: '#123A56',
      borderRadiusSM: 2,
    },
    Descriptions: {
      labelBg: '#F4F6F8',
    },
  },
}
