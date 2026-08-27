import axios from 'axios';

describe('GET /api/v1', () => {
  it('reports an ok health status', async () => {
    const res = await axios.get(`/api/v1`);

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});
