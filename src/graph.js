/**
 * graph.js — Tier 3 Bonus: Extension Sharing Graph
 * Generates a text adjacency list and an interactive vis.js HTML graph.
 */

const fs = require('fs');
const path = require('path');

/**
 * Build adjacency map of extensions that share ≥1 instruction.
 */
function buildExtensionGraph(extMap, multiExtInstrs) {
  const graph = new Map();
  for (const ext of extMap.keys()) graph.set(ext, new Set());

  for (const [, exts] of multiExtInstrs) {
    for (let i = 0; i < exts.length; i++) {
      for (let j = i + 1; j < exts.length; j++) {
        if (graph.has(exts[i])) graph.get(exts[i]).add(exts[j]);
        if (graph.has(exts[j])) graph.get(exts[j]).add(exts[i]);
      }
    }
  }
  return graph;
}

/** Count shared instructions between two extensions. */
function countSharedInstrs(extA, extB, multiExtInstrs) {
  let count = 0;
  for (const [, exts] of multiExtInstrs) {
    if (exts.includes(extA) && exts.includes(extB)) count++;
  }
  return count;
}

/** Print a text-based adjacency summary. */
function printTextGraph(graph, multiExtInstrs) {
  console.log('\n' + '='.repeat(62));
  console.log('  TIER 3 — Extension Sharing Graph (text)');
  console.log('='.repeat(62));
  console.log('  Edges = extensions sharing ≥1 instruction. Weight = shared count.\n');

  const edgesShown = new Set();
  let totalEdges = 0;

  for (const [ext, neighbors] of [...graph.entries()].sort()) {
    if (neighbors.size === 0) continue;
    const line = [];
    for (const nb of [...neighbors].sort()) {
      const key = [ext, nb].sort().join('|');
      if (!edgesShown.has(key)) {
        edgesShown.add(key);
        line.push(`${nb}(${countSharedInstrs(ext, nb, multiExtInstrs)})`);
        totalEdges++;
      }
    }
    if (line.length > 0) console.log(`  ${ext.padEnd(32)} ── ${line.join(', ')}`);
  }
  console.log(`\n  Total edges: ${totalEdges}`);
}

/** Generate a standalone HTML file with an interactive vis.js network graph. */
function generateVisGraph(extMap, multiExtInstrs, outputPath) {
  const nodes = [];
  const edges = [];

  function getGroup(ext) {
    const n = ext.replace(/^rv(32|64)?_/, '');
    if (n.startsWith('zk') || n.startsWith('zvk')) return 'crypto';
    if (n.startsWith('zv') || n === 'v')            return 'vector';
    if (n.startsWith('zb'))                          return 'bitmanip';
    if (n.startsWith('zc') || n === 'c')             return 'compressed';
    if (n.startsWith('zf') || ['f','d','q'].includes(n)) return 'float';
    if (['i','m','a','h','s','u'].includes(n))       return 'base';
    return 'other';
  }

  const colorMap = {
    crypto: '#e67e22', vector: '#3498db', bitmanip: '#2ecc71',
    compressed: '#9b59b6', float: '#e74c3c', base: '#1abc9c', other: '#95a5a6'
  };

  for (const [ext, instrs] of extMap) {
    const group = getGroup(ext);
    nodes.push({
      id: ext,
      label: ext.replace(/^rv(32|64)?_/, '').replace(/^rv(32|64)?/, ''),
      value: instrs.length,
      title: `${ext}<br>${instrs.length} instructions`,
      color: colorMap[group],
      group
    });
  }

  const edgeSet = new Set();
  for (const [, exts] of multiExtInstrs) {
    for (let i = 0; i < exts.length; i++) {
      for (let j = i + 1; j < exts.length; j++) {
        const key = [exts[i], exts[j]].sort().join('||');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          const shared = countSharedInstrs(exts[i], exts[j], multiExtInstrs);
          edges.push({ from: exts[i], to: exts[j], value: shared,
            title: `Shared instructions: ${shared}` });
        }
      }
    }
  }

  const legend = Object.entries(colorMap).map(([g, c]) =>
    `<span style="display:inline-block;width:14px;height:14px;background:${c};border-radius:3px;margin-right:5px;vertical-align:middle"></span>${g}`
  ).join(' &nbsp; ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RISC-V Extension Sharing Graph</title>
  <script src="https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#1a1a2e;color:#eee}
    h1{padding:14px 24px;font-size:1.1rem;background:#16213e;border-bottom:1px solid #333}
    #legend{padding:8px 24px;background:#16213e;font-size:0.8rem;border-bottom:1px solid #333}
    #network{width:100%;height:calc(100vh - 90px)}
    #info{position:fixed;bottom:20px;right:20px;background:#16213e;padding:12px 16px;
          border-radius:8px;border:1px solid #444;font-size:0.8rem;min-width:200px}
  </style>
</head>
<body>
  <h1>RISC-V Extension Sharing Graph — ${nodes.length} extensions, ${edges.length} shared-instruction edges</h1>
  <div id="legend">${legend}</div>
  <div id="network"></div>
  <div id="info">Click a node to inspect it</div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodes)});
    const edges = new vis.DataSet(${JSON.stringify(edges)});
    const network = new vis.Network(document.getElementById('network'),{nodes,edges},{
      nodes:{shape:'dot',scaling:{min:10,max:50},font:{color:'#fff',size:13}},
      edges:{scaling:{min:1,max:6},color:{color:'#555',opacity:0.7}},
      physics:{solver:'forceAtlas2Based',stabilization:{iterations:200}},
      interaction:{hover:true,tooltipDelay:100}
    });
    network.on('selectNode',p=>{
      const n=nodes.get(p.nodes[0]);
      const nb=network.getConnectedNodes(p.nodes[0]);
      document.getElementById('info').innerHTML=
        '<b>'+n.label+'</b><br>'+n.title+'<br>Connected: '+nb.length+' extensions';
    });
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`\n  ✅ Interactive graph saved to: ${outputPath}`);
}

module.exports = { buildExtensionGraph, countSharedInstrs, printTextGraph, generateVisGraph };
