const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/modules/app/components/Home.vue'),
    meta: {
      title: 'Home',
    },
  },
  {
    path: '/endless',
    name: 'Endless',
    component: () => import('@/modules/app/components/endless/Endless.vue'),
    meta: {
      title: 'Endless Mode',
    },
  },
  {
    path: '/shop',
    name: 'Shop',
    component: () => import('@/modules/app/components/shop/Shop.vue'),
    meta: {
      title: 'Shop',
    },
  },
  {
    path: '/buy',
    name: 'Buy',
    component: () => import('@/modules/app/components/buy/Buy.vue'),
    meta: {
      title: 'Buy',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/modules/app/components/Settings/Settings.vue'),
    meta: {
      title: 'Settings',
    },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/modules/app/components/profile/Profile.vue'),
    meta: {
      title: 'Profile',
    },
  },
  //   {
  //     path: '/test',
  //     name: 'Test',
  //     component: () => import('@/modules/app/components/test/Test.vue'),
  //     meta: {
  //       title: 'Test',
  //     },
  //   },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/modules/app/components/privacy-policy/PrivacyPolicy.vue'),
    meta: {
      title: 'Privacy',
    },
  },
]

export default routes
