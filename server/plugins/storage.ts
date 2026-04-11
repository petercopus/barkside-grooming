export default defineNitroPlugin(async () => {
  await ensureBucket();
});
