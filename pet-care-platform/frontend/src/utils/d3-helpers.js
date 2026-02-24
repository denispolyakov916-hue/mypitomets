/**
 * Вспомогательные функции для работы с D3.js в конструкторе графиков
 */

import * as d3 from 'd3';

/**
 * Создание шкал для осей
 */
export function createScales(config, data, dimensions) {
  const { width, height } = dimensions;
  const margin = config.canvas?.margin || { top: 20, right: 30, bottom: 40, left: 50 };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let xScale, yScale;

  // Создание шкалы X
  if (config.axes.x) {
    const xAxis = config.axes.x;

    if (xAxis.type === 'time') {
      // Временная шкала
      const timeExtent = d3.extent(data, d => new Date(d[xAxis.field]));
      xScale = d3.scaleTime()
        .domain(timeExtent)
        .range([0, chartWidth]);

    } else if (xAxis.type === 'linear') {
      // Линейная шкала
      const numericExtent = d3.extent(data, d => +d[xAxis.field]);
      xScale = d3.scaleLinear()
        .domain(numericExtent)
        .range([0, chartWidth]);

    } else if (xAxis.type === 'band') {
      // Категориальная шкала
      const categories = [...new Set(data.map(d => d[xAxis.field]))];
      xScale = d3.scaleBand()
        .domain(categories)
        .range([0, chartWidth])
        .padding(0.1);
    }
  }

  // Создание шкалы Y
  if (config.axes.y && config.axes.y.length > 0) {
    const yAxis = config.axes.y[0]; // Основная ось Y

    const numericExtent = d3.extent(data, d => +d[yAxis.field]);
    const padding = 0.1;
    const range = [
      numericExtent[1] * (1 + padding),
      numericExtent[0] * (1 - padding)
    ];

    yScale = d3.scaleLinear()
      .domain(range)
      .range([0, chartHeight]);
  }

  return {
    xScale,
    yScale,
    chartWidth,
    chartHeight,
    margin
  };
}

/**
 * Рендеринг графика
 */
export function renderChart(svgElement, config, data, dimensions, zoom = d3.zoomIdentity) {
  if (!svgElement || !data || data.length === 0) return;

  const svg = d3.select(svgElement);
  svg.selectAll('*').remove(); // Очистка

  const { xScale, yScale, chartWidth, chartHeight, margin } = createScales(config, data, dimensions);

  // Создание группы для графика
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top}) scale(${zoom.k}) translate(${zoom.x},${zoom.y})`);

  // Добавление сетки
  if (config.style?.grid !== false) {
    addGrid(g, xScale, yScale, chartWidth, chartHeight);
  }

  // Рендеринг слоев
  if (config.layers && config.layers.length > 0) {
    config.layers.forEach(layer => {
      renderLayer(g, layer, data, xScale, yScale, config);
    });
  } else {
    // Автоматический рендеринг если слои не заданы
    renderDefaultLayer(g, data, xScale, yScale, config);
  }

  // Добавление осей
  addAxes(svg, xScale, yScale, chartWidth, chartHeight, margin, config);

  // Добавление легенды
  if (config.legend?.show !== false) {
    addLegend(svg, config, dimensions);
  }

  // Добавление интерактивности
  addInteractivity(svg, config, data, zoom);
}

/**
 * Расширенный рендеринг с поддержкой многослойности
 */
export function renderMultiLayerChart(svgElement, config, data, dimensions, zoom = d3.zoomIdentity) {
  if (!svgElement || !data || data.length === 0) return;

  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  const { xScale, yScale, chartWidth, chartHeight, margin } = createScales(config, data, dimensions);

  // Создание групп для каждого слоя
  const layerGroups = new Map();

  config.layers.forEach((layer, index) => {
    const layerG = svg.append('g')
      .attr('class', `layer-${layer.type}-${index}`)
      .attr('transform', `translate(${margin.left},${margin.top}) scale(${zoom.k}) translate(${zoom.x},${zoom.y})`);

    layerGroups.set(layer.id, layerG);

    // Добавление сетки только для первого слоя
    if (index === 0 && config.style?.grid !== false) {
      addGrid(layerG, xScale, yScale, chartWidth, chartHeight);
    }
  });

  // Рендеринг каждого слоя
  config.layers.forEach(layer => {
    const g = layerGroups.get(layer.id);
    if (g) {
      renderLayer(g, layer, data, xScale, yScale, config);
    }
  });

  // Добавление осей (только один раз)
  addAxes(svg, xScale, yScale, chartWidth, chartHeight, margin, config);

  // Добавление легенды
  if (config.legend?.show !== false) {
    addMultiLayerLegend(svg, config, dimensions);
  }

  // Добавление интерактивности
  addInteractivity(svg, config, data, zoom);
}

/**
 * Рендеринг слоя графика
 */
function renderLayer(g, layer, data, xScale, yScale, config) {
  if (!layer.visible) return;

  const layerData = layer.dataSource ?
    data.filter(d => d[layer.dataSource] !== null && d[layer.dataSource] !== undefined) :
    data;

  switch (layer.type) {
    case 'line':
      renderLineLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'bar':
      renderBarLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'scatter':
      renderScatterLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'area':
      renderAreaLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'bubble':
      renderBubbleLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'heatmap':
      renderHeatmapLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    case 'candlestick':
      renderCandlestickLayer(g, layerData, xScale, yScale, layer.style, config);
      break;
    default:
      console.warn(`Unknown layer type: ${layer.type}`);
  }
}

/**
 * Рендеринг линейного графика
 */
function renderLineLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const yAxis = config.axes.y[0];

  const line = d3.line()
    .x(d => xAxis.type === 'band' ? xScale(d[xAxis.field]) + xScale.bandwidth() / 2 : xScale(d[xAxis.field]))
    .y(d => yScale(d[yAxis.field]))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', style?.stroke || '#3b82f6')
    .attr('stroke-width', style?.strokeWidth || 2)
    .attr('stroke-dasharray', style?.strokeDasharray)
    .attr('d', line);
}

/**
 * Рендеринг столбчатой диаграммы
 */
function renderBarLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const yAxis = config.axes.y[0];

  g.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xAxis.type === 'band' ? xScale(d[xAxis.field]) : xScale(d[xAxis.field]) - 20)
    .attr('width', xAxis.type === 'band' ? xScale.bandwidth() : 40)
    .attr('y', d => yScale(Math.max(0, d[yAxis.field])))
    .attr('height', d => Math.abs(yScale(d[yAxis.field]) - yScale(0)))
    .attr('fill', style?.fill || '#10b981')
    .attr('stroke', style?.stroke || '#059669')
    .attr('stroke-width', style?.strokeWidth || 1);
}

/**
 * Рендеринг точечной диаграммы
 */
function renderScatterLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const yAxis = config.axes.y[0];

  g.selectAll('.dot')
    .data(data)
    .enter().append('circle')
    .attr('class', 'dot')
    .attr('cx', d => xAxis.type === 'band' ? xScale(d[xAxis.field]) + xScale.bandwidth() / 2 : xScale(d[xAxis.field]))
    .attr('cy', d => yScale(d[yAxis.field]))
    .attr('r', style?.radius || 4)
    .attr('fill', style?.fill || '#C86BFA')
    .attr('stroke', style?.stroke || '#7c3aed')
    .attr('stroke-width', style?.strokeWidth || 1)
    .attr('opacity', style?.opacity || 0.7);
}

/**
 * Рендеринг диаграммы с областями
 */
function renderAreaLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const yAxis = config.axes.y[0];

  const area = d3.area()
    .x(d => xAxis.type === 'band' ? xScale(d[xAxis.field]) + xScale.bandwidth() / 2 : xScale(d[xAxis.field]))
    .y0(yScale(0))
    .y1(d => yScale(d[yAxis.field]))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(data)
    .attr('fill', style?.fill || 'rgba(59, 130, 246, 0.3)')
    .attr('stroke', style?.stroke || '#3b82f6')
    .attr('stroke-width', style?.strokeWidth || 1)
    .attr('d', area);
}

/**
 * Рендеринг пузырьковой диаграммы
 */
function renderBubbleLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const yAxis = config.axes.y[0];

  // Определение размеров пузырей
  const sizeField = style?.sizeField || yAxis.field;
  const sizeExtent = d3.extent(data, d => +d[sizeField]);
  const sizeScale = d3.scaleSqrt()
    .domain(sizeExtent)
    .range([style?.minRadius || 5, style?.maxRadius || 25]);

  // Цветовая шкала
  const colorField = style?.colorField;
  let colorScale;
  if (colorField) {
    const colorExtent = d3.extent(data, d => +d[colorField]);
    colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain(colorExtent);
  }

  g.selectAll('.bubble')
    .data(data)
    .enter().append('circle')
    .attr('class', 'bubble')
    .attr('cx', d => xAxis.type === 'band' ? xScale(d[xAxis.field]) + xScale.bandwidth() / 2 : xScale(d[xAxis.field]))
    .attr('cy', d => yScale(d[yAxis.field]))
    .attr('r', d => sizeScale(d[sizeField]))
    .attr('fill', d => colorField ? colorScale(d[colorField]) : (style?.fill || '#C86BFA'))
    .attr('stroke', style?.stroke || '#7c3aed')
    .attr('stroke-width', style?.strokeWidth || 1)
    .attr('opacity', style?.opacity || 0.7);
}

/**
 * Рендеринг тепловой карты
 */
function renderHeatmapLayer(g, data, xScale, yScale, style, config) {
  // Группировка данных для тепловой карты
  const groupedData = d3.rollup(
    data,
    v => d3.mean(v, d => d[config.axes.y[0].field]),
    d => d[config.axes.x.field]
  );

  const heatmapData = Array.from(groupedData, ([key, value]) => ({ key, value }));

  // Цветовая шкала для тепловой карты
  const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
    .domain(d3.extent(heatmapData, d => d.value));

  const cellWidth = xScale.bandwidth ? xScale.bandwidth() : 40;
  const cellHeight = 30;

  g.selectAll('.heatmap-cell')
    .data(heatmapData)
    .enter().append('rect')
    .attr('class', 'heatmap-cell')
    .attr('x', d => xScale(d.key))
    .attr('y', (d, i) => i * cellHeight)
    .attr('width', cellWidth)
    .attr('height', cellHeight)
    .attr('fill', d => colorScale(d.value))
    .attr('stroke', style?.stroke || '#ffffff')
    .attr('stroke-width', style?.strokeWidth || 1);
}

/**
 * Рендеринг свечного графика (candlestick)
 */
function renderCandlestickLayer(g, data, xScale, yScale, style, config) {
  const xAxis = config.axes.x;
  const candleWidth = xScale.bandwidth ? xScale.bandwidth() * 0.8 : 10;

  g.selectAll('.candlestick')
    .data(data)
    .enter().append('g')
    .attr('class', 'candlestick')
    .each(function(d) {
      const g = d3.select(this);
      const x = xAxis.type === 'band' ? xScale(d[xAxis.field]) + xScale.bandwidth() / 2 : xScale(d[xAxis.field]);
      const open = d.open || d[yAxis.field];
      const close = d.close || d[yAxis.field];
      const high = d.high || Math.max(open, close);
      const low = d.low || Math.min(open, close);

      const isGreen = close > open;

      // Тело свечи
      g.append('rect')
        .attr('x', x - candleWidth / 2)
        .attr('y', Math.min(yScale(open), yScale(close)))
        .attr('width', candleWidth)
        .attr('height', Math.abs(yScale(open) - yScale(close)))
        .attr('fill', isGreen ? (style?.bullColor || '#10b981') : (style?.bearColor || '#ef4444'))
        .attr('stroke', style?.stroke || '#374151')
        .attr('stroke-width', style?.strokeWidth || 1);

      // Тени (фитили)
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', yScale(high))
        .attr('y2', yScale(low))
        .attr('stroke', style?.wickColor || '#374151')
        .attr('stroke-width', style?.wickWidth || 1);
    });
}

/**
 * Рендеринг слоя по умолчанию (если слои не заданы)
 */
function renderDefaultLayer(g, data, xScale, yScale, config) {
  const defaultStyle = {
    stroke: '#3b82f6',
    strokeWidth: 2,
    fill: 'none'
  };

  renderLineLayer(g, data, xScale, yScale, defaultStyle, config);
}

/**
 * Добавление сетки
 */
function addGrid(g, xScale, yScale, width, height) {
  // Вертикальные линии
  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .tickSize(-height)
      .tickFormat('')
    )
    .selectAll('line')
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 1);

  // Горизонтальные линии
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat('')
    )
    .selectAll('line')
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 1);
}

/**
 * Добавление осей
 */
function addAxes(svg, xScale, yScale, width, height, margin, config) {
  // Ось X
  if (xScale) {
    const xAxis = d3.axisBottom(xScale);

    if (config.axes.x?.format) {
      // Применение форматирования если указано
    }

    svg.append('g')
      .attr('transform', `translate(${margin.left},${height + margin.top})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'middle');
  }

  // Ось Y
  if (yScale) {
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(yAxis);
  }
}

/**
 * Добавление легенды
 */
function addLegend(svg, config, dimensions) {
  if (!config.legend || !config.axes.y || config.axes.y.length === 0) return;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${dimensions.width - 120}, 20)`);

  config.axes.y.forEach((axis, index) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${index * 20})`);

    // Цветной прямоугольник
    legendRow.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', axis.color || '#3b82f6');

    // Текст
    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 9)
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text(axis.label || axis.field);
  });
}

/**
 * Добавление легенды для многослойных графиков
 */
function addMultiLayerLegend(svg, config, dimensions) {
  if (!config.legend || !config.layers || config.layers.length === 0) return;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${dimensions.width - 150}, 20)`);

  config.layers.forEach((layer, index) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${index * 20})`);

    // Символ типа графика
    const symbol = getLayerSymbol(layer.type);
    if (symbol.type === 'rect') {
      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', layer.style?.fill || layer.style?.stroke || '#3b82f6');
    } else if (symbol.type === 'circle') {
      legendRow.append('circle')
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('r', 6)
        .attr('fill', layer.style?.fill || '#3b82f6')
        .attr('stroke', layer.style?.stroke)
        .attr('stroke-width', layer.style?.strokeWidth || 1);
    } else if (symbol.type === 'line') {
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 12)
        .attr('y1', 6)
        .attr('y2', 6)
        .attr('stroke', layer.style?.stroke || '#3b82f6')
        .attr('stroke-width', layer.style?.strokeWidth || 2);
    }

    // Текст
    legendRow.append('text')
      .attr('x', 18)
      .attr('y', 9)
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text(getLayerTypeLabel(layer.type));
  });
}

/**
 * Получение символа для типа слоя
 */
function getLayerSymbol(layerType) {
  switch (layerType) {
    case 'line':
      return { type: 'line' };
    case 'bar':
      return { type: 'rect' };
    case 'scatter':
    case 'bubble':
      return { type: 'circle' };
    case 'area':
      return { type: 'rect', opacity: 0.5 };
    default:
      return { type: 'rect' };
  }
}

/**
 * Получение названия типа слоя
 */
function getLayerTypeLabel(layerType) {
  const labels = {
    line: 'Линейный график',
    bar: 'Столбчатая диаграмма',
    scatter: 'Точечная диаграмма',
    bubble: 'Пузырьковая диаграмма',
    area: 'Диаграмма с областями',
    heatmap: 'Тепловая карта',
    candlestick: 'Свечной график'
  };
  return labels[layerType] || layerType;
}

/**
 * Добавление интерактивности
 */
export function addInteractivity(svg, config, data, initialZoom = d3.zoomIdentity) {
  if (!config.interaction) return;

  const { tooltip = true, zoom = true, pan = true } = config.interaction;

  // Tooltip
  if (tooltip) {
    const tooltipDiv = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', 1000);

    svg.selectAll('.dot, .bar')
      .on('mouseover', function(event, d) {
        tooltipDiv.transition()
          .duration(200)
          .style('opacity', 0.9);

        const xAxis = config.axes.x;
        const yAxis = config.axes.y[0];

        tooltipDiv.html(`
          <div><strong>${xAxis.label || xAxis.field}:</strong> ${d[xAxis.field]}</div>
          <div><strong>${yAxis.label || yAxis.field}:</strong> ${d[yAxis.field]}</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltipDiv.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

  // Zoom and pan
  if (zoom || pan) {
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', function(event) {
        const transform = event.transform;
        svg.select('g').attr('transform', `scale(${transform.k}) translate(${transform.x},${transform.y})`);
      });

    svg.call(zoomBehavior);

    // Отключение zoom если не нужен
    if (!zoom) {
      zoomBehavior.scaleExtent([1, 1]);
    }

    // Отключение pan если не нужен
    if (!pan) {
      zoomBehavior.on('zoom', null);
    }
  }
}

/**
 * Создание цветовой палитры
 */
export function createColorPalette(count) {
  const schemes = [
    d3.schemeCategory10,
    d3.schemeAccent,
    d3.schemeDark2,
    d3.schemePaired,
    d3.schemeSet1,
    d3.schemeSet2,
    d3.schemeSet3
  ];

  const selectedScheme = schemes[count % schemes.length];
  return d3.scaleOrdinal(selectedScheme);
}

/**
 * Форматирование значений
 */
export function formatValue(value, formatType) {
  switch (formatType) {
    case 'currency':
      return d3.format('$,.0f')(value);
    case 'percentage':
      return d3.format('.1%')(value);
    case 'integer':
      return d3.format(',')(value);
    case 'decimal':
      return d3.format(',.2f')(value);
    case 'date':
      return d3.timeFormat('%d.%m.%Y')(new Date(value));
    case 'datetime':
      return d3.timeFormat('%d.%m.%Y %H:%M')(new Date(value));
    default:
      return value;
  }
}

/**
 * Экспорт графика в изображение
 */
export function exportChart(svgElement, config, format = 'png') {
  return new Promise((resolve, reject) => {
    try {
      const svg = svgElement;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Получение размеров
      const bbox = svg.getBBox();
      canvas.width = bbox.width;
      canvas.height = bbox.height;

      // Конвертация SVG в canvas
      const svgString = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toDataURL(`image/${format}`).then(dataUrl => {
          resolve(dataUrl);
        });
      };

      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    } catch (error) {
      reject(error);
    }
  });
}
