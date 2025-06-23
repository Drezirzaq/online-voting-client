<template>
  <svg ref="svgEl" :width="svgW" :height="svgH" />
</template>

<script>
import * as d3 from "d3";
import { ref, watch, onMounted } from "vue";

export default {
  name: "MerkleTree",
  props: {
    levels: { type: Array, required: true },
    leafIdx: { type: Number, required: true },
  },
  setup(props) {
    const svgW = 560;
    const svgH = 340;
    const pad = 20;

    const rectW = 56;
    const rectH = 26;
    const minGap = 8; // минимальный горизонтальный зазор

    const svgEl = ref(null);

    const shortLabel = (h) => {
      const s = String(h).replace(/,/g, "");
      return s.length <= 6 ? s : `${s.slice(0, 4)}..${s.slice(-2)}`;
    };

    const buildPathSet = () => {
      const s = new Set();
      let idx = props.leafIdx;
      for (let lvl = 0; lvl < props.levels.length; lvl++) {
        s.add(`${lvl}-${idx}`);
        if (lvl === props.levels.length - 1) break;
        idx >>= 1;
      }
      return s;
    };

    const flatNodes = () => {
      const out = [];
      const last = props.levels.length - 1;
      const pset = buildPathSet();
      props.levels.forEach((lvl, lvlIdx) => {
        lvl.forEach((hash, i) => {
          out.push({
            id: `${lvlIdx}-${i}`,
            parentId:
              lvlIdx === last ? null : `${lvlIdx + 1}-${Math.floor(i / 2)}`,
            label: shortLabel(hash),
            isPath: pset.has(`${lvlIdx}-${i}`),
          });
        });
      });
      return out;
    };

    function draw() {
      if (!svgEl.value || !props.levels.length) return;

      const verGap = Math.max(
        40,
        (svgH - pad * 2 - rectH) / (props.levels.length - 1)
      );

      const svg = d3.select(svgEl.value);
      svg.selectAll("*").remove();
      svg.attr("width", svgW).attr("height", svgH);

      const root = d3
        .stratify()
        .id((d) => d.id)
        .parentId((d) => d.parentId)(flatNodes());
      const tree = d3
        .tree()
        .nodeSize([rectW + minGap, verGap])
        .separation(() => 1);
      const data = tree(root);

      const xExt = d3.extent(data.descendants(), (d) => d.x);
      const yExt = d3.extent(data.descendants(), (d) => d.y);
      const layW = xExt[1] - xExt[0] + rectW;
      const layH = yExt[1] - yExt[0] + rectH;
      const scale = Math.min(
        (svgW - pad * 2) / layW,
        (svgH - pad * 2) / layH,
        1
      );
      const offX = (svgW - layW * scale) / 2 - xExt[0] * scale;
      const offY = (svgH - layH * scale) / 2 - yExt[0] * scale;

      const g = svg
        .append("g")
        .attr("transform", `translate(${offX},${offY}) scale(${scale})`);

      g.append("g")
        .selectAll("line")
        .data(data.links())
        .join("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .attr("stroke", (d) =>
          d.source.data.isPath && d.target.data.isPath ? "#28a745" : "#999"
        )
        .attr("stroke-width", 2);

      const nodeG = g
        .append("g")
        .selectAll("g")
        .data(data.descendants())
        .join("g")
        .attr(
          "transform",
          (d) => `translate(${d.x - rectW / 2},${d.y - rectH / 2})`
        );

      nodeG
        .append("rect")
        .attr("width", rectW)
        .attr("height", rectH)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "#fff")
        .attr("stroke", (d) => (d.data.isPath ? "#28a745" : "#007bff"))
        .attr("stroke-width", 2);

      nodeG
        .append("text")
        .attr("x", rectW / 2)
        .attr("y", rectH / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-family", "monospace")
        .attr("fill", (d) => (d.data.isPath ? "#28a745" : "#007bff"))
        .text((d) => d.data.label);
    }

    watch(() => [props.levels, props.leafIdx], draw, {
      deep: true,
      immediate: true,
    });
    onMounted(draw);

    return { svgEl, svgW, svgH };
  },
};
</script>

<style scoped></style>
