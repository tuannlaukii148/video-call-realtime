export interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
  active?: boolean;
  live?: boolean;
  participantImage?: string;
  participantInitials?: string;
  online?: boolean;
}

export interface ChatParticipant {
  id: string;
  name: string;
  image?: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  meta: string;
}

export interface MessageItem {
  id: string;
  author: string;
  sentAt: string;
  content: string;
  direction: "incoming" | "outgoing";
  image: string;
  attachment?: AttachmentItem;
}

export const conversations: ConversationItem[] = [
  {
    id: "creative-design-sync",
    title: "Creative Design Sync",
    preview: "Julian: Let's finalize the layout grid.",
    timeLabel: "JUST NOW",
    active: true,
    participantImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuANUUqntV18zYhcA5byKWsodhiMl92X956pS1M5xQgEQVJr40O3mDo25I9Cm4MLmdBssiSC9vyajCpQ6JjvlycWMPKNNHY1aVgs81kLloR8O9YpQRryVaCqyzOpNsSjHrgs-29yepQFMy43G-NlggVXbN3xXS0SYW3NmNAOtfS1up6xe06liA2npomMooDXh0ZR9QEhjwAd_VS9QgahDc3htnfaOcY14mx4GKSd8ppDP0KNbMkS6iVvKmSipTMXMb3aeddL-tY3391_",
    online: true,
  },
  {
    id: "marcus-wright",
    title: "Marcus Wright",
    preview: "The editorial shadow looks perfect.",
    timeLabel: "12M AGO",
    live: true,
    participantImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAxqr-CaXx39gJEYSsrjKy2dNdWFhFJ5KEgu3nKcCd_cbEq8D5lLmfvi3O80Rf5Ef_PiAaEYIGAD2d316tHW0oLR3AvnQ-EQOl8aMIF6lozndudKS5j2hmiAQOSXalFqhba6Z4d_dsYXi0uO0yZ61kZ3y1pK65xMxZdct31EvzzuX-Ir-iINVyMurOOXlLR8TF6U-67gSi0u6itZ3Ewy23maQhy6LLOERWzz6ofb2zOoIs-SVAMIK106SDmcUg7RR3Lw08vvX8U7AKV",
  },
  {
    id: "sarah-miller",
    title: "Sarah Miller",
    preview: "I've uploaded the new brand assets.",
    timeLabel: "2H AGO",
    participantInitials: "SM",
  },
  {
    id: "internal-strategy",
    title: "Internal Strategy",
    preview: "We need to discuss the Q3 roadmap.",
    timeLabel: "YESTERDAY",
    participantImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBo3SfL2kPm2w7pmvA-MVId5ZF6hGy5_aoT1LAOT6Y4S3zAY_pl88DbNrHaEybhMYFwyAkQZxXnasipTqheSNiHY4PXotgpiF7oB38xj7YPPiSRRpkYGyy4A1dtO4ENJnkuP5gBU9Yk720swLtae7u-gRSDmzFGjRxel-BbCoZgMPSsgsrMo8_WEDK3ELHpSlaZadJFBPFliBJV0940N5XAL131aHxM-fcHQEpBTBK319RNQ-35uiNlOQZR6Xu7J1R0rArViQU6sPXI",
  },
];

export const chatParticipants: ChatParticipant[] = [
  {
    id: "julian",
    name: "Julian Chen",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBsTJLhZwvYmubW0qxtKMUiJSjf_rPqoSoCTdK0bAFMDwagCAIkW-i8Qu6IeKF8bSYWiLRkjx1vbMnmhmYO_-hjApw43C9-HORvHhZO53ZC1pSTw05JhN45V4Gss6oeOhzXMhxPm-huBfXT-xdQ6legyVs3v7ASGk_jeucQTqBtS_BM_34qgfYikhu_iiDNSiz0vYJOTZN4LDXpJgatm4S-oUCxyq6ZKli5rgTOTpx10gA0GN9qbNbSFYo0q2snAMND9kuvGFcTlpgc",
  },
  {
    id: "marcus",
    name: "Marcus Wright",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDaY1Z3XbxB3h5Vyogdi-ni0v7d4IKnj7Yr9Go0VXVJbjRkP0hk6aQh6YzaHJyIu_nuPHVwIV4o7xyFqX6Y83uXexrsAPa0ipRQkFHixNNBJ0tZGJuV2-uu0EUshV8WAyFKepoe8-HtAdATqrWURdcvZJr8YR00WKRZj3gw9dezcd9dnsGXyfBhsbKsGmmjrSVoMUvqXYWAkBbyB-DauWkfcAYL23OKjaXe2YkWlvSIME_vxmWwLJqRyY5vFup6zv3tC2gixnywhK-5",
  },
];

export const messages: MessageItem[] = [
  {
    id: "m1",
    author: "Julian Chen",
    sentAt: "10:15 AM",
    content:
      "Hey everyone! I've just updated the wireframes for the new dashboard. I really want to lean into the magazine-style layout for the meeting schedule.",
    direction: "incoming",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBH9mDXSGztclIeNwOnl63PKDjF6ScQtEQ4POdkvHlk2U2MXQ2OeXCOn2o6ClvIW_FvepG-BWd3JqF5uGhmwv4i2B1ONKXKDbJDDsv13nT3YzlkflQa7-fe1Pppo0EEWFg8GU2OL-taHYTsRqnSqy4W4IpdVVp2WYqVQrCFLryMW4OUWIwapMvxikb7yn3YgVoQWagzui3STxCRYQg-yF0xyQPmC01bIOgBo54AOxfux489x5qAVVuRP_m9NEK5OEB4FGDFBm3KbPIQ",
  },
  {
    id: "m2",
    author: "You",
    sentAt: "10:18 AM",
    content:
      "That looks stunning, Julian. The whitespace really gives the content room to breathe. Should we use the terracotta accents for the active states?",
    direction: "outgoing",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBfRUUKsZBitsVsYpGKczO1WTl4NQNOBMhDkFhOsBKoFW53hSTVCRi4-jog8n3awQ5G7M_ynmm5qB5a08upD5_nYPFeUW8DeVyyx9tHCqawBXEjiNyMdja0TRbsqCDLJMJFY6jSXWabBhx8nlrWDrH5WG7uw4XA8SUVUnTdpnfMyuDAtp-u0_0kqN4ctmR7dACDAhTlUmS5XGWXM3smDpW67KFutg3RKbXD-0kfeyBeGWslJL-mTFonUYxFS8nUfLL9gKIwo8xgW36F",
  },
  {
    id: "m3",
    author: "Marcus Wright",
    sentAt: "10:22 AM",
    content:
      "Yes, terracotta works perfectly with the cream background. Here's the updated color palette for the studio theme.",
    direction: "incoming",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCnupYbysyA5H9syUOhRRHDXe7lDm35gbc0TEMDOQVRuSGJbvAaEjJgNwdcokEAhdzXkc53fmAc3ZdvwE_CIu_4ZCfDuOmuO69mXnxcGtM9XxbM_SAV_FnRtqI74Wluvql_W8u_1kr7Bx79A8bKCrVHDSyXqr6kZBuLGJjoUrDxxFhb3D6SHoUzKgQwvlU6WqNMYNcaEHTwYnk_03LZpJZETl3y5jhzS2RWUT5Bbm43wjvKjWSMbsaTo_fSUzltiqIWHYXOr4aXbQQk",
    attachment: {
      id: "a1",
      name: "Studio_Color_Guide.pdf",
      meta: "2.4 MB • PDF Document",
    },
  },
];
