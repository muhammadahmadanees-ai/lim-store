const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kagimdnkyqfduhcbkceo.supabase.co';
const supabaseKey = 'sb_secret_woVNzqQWbh68Nqk1svsLpg_lSkJYWEz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function transfer() {
    console.log("Transferring Logo...");
    const logoRes = await fetch('https://res.cloudinary.com/doiujqcpw/image/upload/v1780002822/lim_transparent_logo_2_3_rvmif4.png');
    const logoBuf = await logoRes.arrayBuffer();
    
    const { data: logoData, error: logoErr } = await supabase.storage.from('images').upload('lim_transparent_logo.png', logoBuf, {
        contentType: 'image/png',
        upsert: true
    });
    if (logoErr) console.error("Logo error:", logoErr);
    else {
        const { data: logoUrl } = supabase.storage.from('images').getPublicUrl('lim_transparent_logo.png');
        console.log("Logo URL:", logoUrl.publicUrl);
    }

    console.log("Transferring Video (this may take a bit for 91MB)...");
    const vidRes = await fetch('https://res.cloudinary.com/doiujqcpw/video/upload/v1780236097/IMG_0671_cektka.mp4');
    const vidBuf = await vidRes.arrayBuffer();

    const { data: vidData, error: vidErr } = await supabase.storage.from('images').upload('IMG_0671.mp4', vidBuf, {
        contentType: 'video/mp4',
        upsert: true
    });
    if (vidErr) console.error("Video error:", vidErr);
    else {
        const { data: vidUrl } = supabase.storage.from('images').getPublicUrl('IMG_0671.mp4');
        console.log("Video URL:", vidUrl.publicUrl);
    }
}

transfer();
