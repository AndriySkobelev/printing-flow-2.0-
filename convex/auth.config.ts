export default {
  providers: [
    {
      domain: process.env.NODE_ENV === 'production'
      ? process.env.CONVEX_SITE_URL
      : 'localhost',
      applicationID: "convex",
    },
  ],
};
