import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface PlmFabric {
  fabric_code?: string;
  code?: string;
  kod?: string;
  fabric_name?: string;
  name?: string;
  ad?: string;
  color?: string;
  renk?: string;
  unit?: string;
  birim?: string;
}

const normalize = (row: PlmFabric) => ({
  fabric_code: String(row.fabric_code ?? row.code ?? row.kod ?? "").trim(),
  fabric_name: (row.fabric_name ?? row.name ?? row.ad ?? null) as string | null,
  color: (row.color ?? row.renk ?? null) as string | null,
  unit: (row.unit ?? row.birim ?? "kg") as string,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Oturum bulunamadı.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Oturum doğrulanamadı.' }, 401);

    const body = await req.json().catch(() => ({}));
    const sasId = String(body?.sas_id ?? '');
    const modelName = String(body?.model_name ?? '');
    const poNumber = String(body?.po_number ?? '');
    const orderQuantity = Number(body?.order_quantity ?? 0);

    if (!sasId || !modelName || !poNumber) {
      return json({ error: 'sas_id, model_name ve po_number zorunludur.' }, 400);
    }

    const plmUrl = Deno.env.get('PLM_API_URL');
    const plmKey = Deno.env.get('PLM_API_KEY');
    if (!plmUrl || !plmKey) {
      const message =
        'PLM bağlantısı henüz tanımlı değil. Kumaş kalemlerini elle ekleyebilirsiniz.';
      await supabase.from('sas_forms').update({ plm_error: message }).eq('id', sasId);
      return json({ error: message, code: 'plm_not_configured' }, 400);
    }

    const url = new URL(plmUrl);
    url.searchParams.set('model', modelName);
    url.searchParams.set('po', poNumber);

    const plmRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${plmKey}`, Accept: 'application/json' },
    });

    if (!plmRes.ok) {
      const details = await plmRes.text();
      console.error(`PLM request failed [${plmRes.status}]: ${details}`);
      await supabase
        .from('sas_forms')
        .update({ plm_error: `PLM hatası (${plmRes.status})` })
        .eq('id', sasId);
      return json({ error: 'PLM isteği başarısız oldu.', status: plmRes.status, details }, plmRes.status);
    }

    const payload = await plmRes.json();
    const rows: PlmFabric[] = Array.isArray(payload)
      ? payload
      : (payload?.items ?? payload?.data ?? payload?.fabrics ?? []);

    const items = rows
      .map(normalize)
      .filter((r) => r.fabric_code.length > 0)
      .map((r) => ({
        ...r,
        sas_id: sasId,
        order_quantity: orderQuantity,
        source: 'plm',
      }));

    if (items.length === 0) {
      const message = 'PLM bu model ve PO için kumaş kodu döndürmedi.';
      await supabase.from('sas_forms').update({ plm_error: message }).eq('id', sasId);
      return json({ error: message, code: 'no_rows' }, 404);
    }

    await supabase.from('sas_items').delete().eq('sas_id', sasId).eq('source', 'plm');
    const { error: insertError } = await supabase.from('sas_items').insert(items);
    if (insertError) {
      console.error('Insert failed:', insertError.message);
      return json({ error: insertError.message }, 400);
    }

    await supabase
      .from('sas_forms')
      .update({ plm_fetched_at: new Date().toISOString(), plm_error: null, status: 'gramaj_pending' })
      .eq('id', sasId);

    return json({ inserted: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('plm-fetch-fabrics error:', message);
    return json({ error: message }, 500);
  }
});
