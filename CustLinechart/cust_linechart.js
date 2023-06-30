var getScriptPromisify = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

const parseMetadata = metadata => {
  const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata
  const dimensions = []
  for (const key in dimensionsMap) {
    const dimension = dimensionsMap[key]
    dimensions.push({ key, ...dimension })
  }
  const measures = []
  for (const key in measuresMap) {
    const measure = measuresMap[key]
    measures.push({ key, ...measure })
  }
  return { dimensions, measures, dimensionsMap, measuresMap }
}

(function () {
  const prepared = document.createElement('template')
  prepared.innerHTML = `
    <style>
    </style>
    <div id="root" style="width: 100%; height: 100%;">
    </div>
  `
  class LineSamplePrepped extends HTMLElement {
    constructor() {
      super()

      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(prepared.content.cloneNode(true))

      this._root = this._shadowRoot.getElementById('root')

      this._props = {}

      this.render()
    }

    onCustomWidgetResize(width, height) {
      this.render()
    }

    onCustomWidgetAfterUpdate(changedProps) {
      this.render()
    }

    async render() {
      const dataBinding = this.dataBinding
      if (!dataBinding || dataBinding.state !== 'success') {
        return
      }

      const { data, metadata } = dataBinding
      const { dimensions, measures } = parseMetadata(metadata)

      // dimension
      const categoryData = []

      // measures
      const series = measures.map(measure => {
        return {
          data: [],
          key: measure.key
        }
      })

      data.forEach(row => {
        // dimension
        categoryData.push(dimensions.map(dimension => {
          return row[dimension.key].label
        }).join('/'))
        // measures
        series.forEach(series => {
          series.data.push(row[series.key].raw)
        })
      })

      // Create the SVG element
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      this._root.appendChild(svg);

      // Calculate the dimensions and margins
      const margin = { top: 20, right: 20, bottom: 30, left: 50 };
      const width = this._root.clientWidth - margin.left - margin.right;
      const height = this._root.clientHeight - margin.top - margin.bottom;

      // Create the scales
      const xScale = d3.scaleBand()
        .domain(categoryData)
        .range([0, width])
        .padding(0.1);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d.data))])
        .range([height, 0]);

      // Create the axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);

      // Append the axes to the SVG
      svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis);

      svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxis);

      // Create the line generator
      const line = d3.line()
        .x((d, i) => xScale(categoryData[i]) + margin.left + xScale.bandwidth() / 2)
        .y(d => yScale(d))
        .curve(d3.curveLinear);

      // Append the lines to the SVG
      svg.selectAll('.line')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('d', d => line(d.data))
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    }
  }

  customElements.define('com-sap-sample-echarts-line_chart', LineSamplePrepped)
})()
