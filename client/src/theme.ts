import type { ThemeConfig } from 'antd'

/** Sober finance-ops theme — forest/slate, not purple AI defaults. */
export const deskTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1f5c45',
    colorInfo: '#2f4d7a',
    colorSuccess: '#1f5c45',
    colorWarning: '#8a5a12',
    colorError: '#8f2f2a',
    colorText: '#14231c',
    colorTextSecondary: '#4a5c52',
    colorBorder: '#c5d0c9',
    colorBgLayout: '#eef1f0',
    colorBgContainer: '#ffffff',
    borderRadius: 6,
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      bodyBg: '#eef1f0',
    },
    Table: {
      headerBg: '#f3f6f4',
      rowHoverBg: '#f2f6f3',
    },
    Card: {
      headerFontSize: 16,
    },
    Tag: {
      defaultBg: '#e8eee9',
      defaultColor: '#345041',
    },
  },
}
