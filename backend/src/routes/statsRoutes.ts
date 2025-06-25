import { Router } from 'express';
import supabase from '../utils/supabaseClient';

const router = Router();

// Get rug pull statistics
router.get('/rugs', async (req, res) => {
  try {
    // Get rug pull stats from the database
    const { data: rugStats, error } = await supabase
      .from('rug_pull_events')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error fetching rug stats:', error);
      return res.status(500).json({ error: 'Failed to fetch rug statistics' });
    }

    // Calculate statistics
    const totalRugs = rugStats?.length || 0;
    const last24h = rugStats?.filter(rug => {
      const rugTime = new Date(rug.created_at).getTime();
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return rugTime > dayAgo;
    }).length || 0;

    const totalValueLost = rugStats?.reduce((sum, rug) => {
      return sum + (rug.estimated_loss_usd || 0);
    }, 0) || 0;

    res.json({
      totalRugs,
      last24h,
      totalValueLost,
      recentRugs: rugStats?.slice(0, 10) || []
    });
  } catch (error) {
    console.error('Error in /api/stats/rugs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;