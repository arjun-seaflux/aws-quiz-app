// Renders a simple left-to-right flow diagram from a declarative spec:
//   { layers: [[nodeId, ...], ...], nodes: { id: { label, sub?, tone? } },
//     edges: [[from, to, label?, { dashed? }?], ...] }
// Layers become columns; nodes within a layer are stacked and centred.
const NODE_W = 164;
const NODE_H = 54;
const GAP_X = 90;
const GAP_Y = 22;
const PAD = 14;

function layout(spec) {
  const pos = {};
  const maxRows = Math.max(...spec.layers.map((l) => l.length));
  const innerH = maxRows * NODE_H + (maxRows - 1) * GAP_Y;
  spec.layers.forEach((layer, c) => {
    const colH = layer.length * NODE_H + (layer.length - 1) * GAP_Y;
    const top = PAD + (innerH - colH) / 2;
    layer.forEach((id, r) => {
      pos[id] = { x: PAD + c * (NODE_W + GAP_X), y: top + r * (NODE_H + GAP_Y) };
    });
  });
  return {
    pos,
    w: PAD * 2 + spec.layers.length * NODE_W + (spec.layers.length - 1) * GAP_X,
    h: PAD * 2 + innerH,
  };
}

export default function Diagram({ spec }) {
  const { pos, w, h } = layout(spec);
  const uid = spec.title.replace(/\W+/g, "");
  return (
    <figure className="dg">
      <figcaption className="dg-title">{spec.title}</figcaption>
      <div className="dg-scroll">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ minWidth: Math.min(w, 760) }}
          role="img"
          aria-label={spec.title}
        >
          <defs>
            <marker id={`ar-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="dg-arrow-head" />
            </marker>
          </defs>
          {spec.edges.map(([from, to, label, opt], i) => {
            const a = pos[from], b = pos[to];
            const forward = b.x > a.x;
            const x1 = forward ? a.x + NODE_W : a.x;
            const x2 = forward ? b.x : b.x + NODE_W;
            const y1 = a.y + NODE_H / 2, y2 = b.y + NODE_H / 2;
            const dx = Math.max(24, Math.abs(x2 - x1) / 2) * (forward ? 1 : -1);
            // Label sits 40% along the curve so edges fanning in/out don't stack their labels.
            const t = 0.4, u = 1 - t;
            const mx = u ** 3 * x1 + 3 * u * u * t * (x1 + dx) + 3 * u * t * t * (x2 - dx) + t ** 3 * x2;
            const my = u ** 3 * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y2;
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
                  className={`dg-edge ${opt?.dashed ? "dg-edge--dashed" : ""}`}
                  markerEnd={`url(#ar-${uid})`}
                />
                {label && (
                  <g transform={`translate(${mx},${my})`}>
                    <rect x={-label.length * 3.1 - 5} y={-9} width={label.length * 6.2 + 10} height={16} rx={8} className="dg-label-bg" />
                    <text textAnchor="middle" y={3} className="dg-label">{label}</text>
                  </g>
                )}
              </g>
            );
          })}
          {Object.entries(pos).map(([id, p]) => {
            const n = spec.nodes[id];
            return (
              <g key={id} transform={`translate(${p.x},${p.y})`} className={`dg-node dg-tone-${n.tone || "default"}`}>
                <rect width={NODE_W} height={NODE_H} rx={11} />
                <text x={NODE_W / 2} y={n.sub ? 23 : 31} textAnchor="middle" className="dg-node-label">{n.label}</text>
                {n.sub && <text x={NODE_W / 2} y={40} textAnchor="middle" className="dg-node-sub">{n.sub}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {spec.caption && <p className="dg-caption">{spec.caption}</p>}
    </figure>
  );
}
