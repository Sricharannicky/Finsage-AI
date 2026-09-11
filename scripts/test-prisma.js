(async ()=>{
  const { PrismaClient } = require('@prisma/client')
  const p = new PrismaClient()
  try {
    const r = await p.$queryRaw`SELECT 1 as result`
    console.log('OK', r)
  } catch (e) {
    console.error('ERR', e)
  } finally {
    await p.$disconnect()
  }
})()
