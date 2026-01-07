import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import './Canvas.css';

const Canvas = forwardRef(({ config, data, loading, styleConfig, selectedMetrics }, ref) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(300, width),
          height: Math.max(250, height)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Format numbers based on config
  const formatValue = useCallback((value, format) => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (isNaN(num)) return value;

    switch (format) {
      case 'integer': return Math.round(num).toLocaleString('ru-RU');
      case 'decimal': return num.toFixed(2);
      case 'currency': return num.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });
      case 'percent': return `${(num * 100).toFixed(1)}%`;
      case 'compact':
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString('ru-RU');
      default: return num.toLocaleString('ru-RU');
    }
  }, []);

  // Get line dash array
  const getLineDash = (style) => {
    switch (style) {
      case 'dashed': return '8,4';
      case 'dotted': return '2,4';
      case 'dashdot': return '8,4,2,4';
      default: return 'none';
    }
  };

  // Get curve type
  const getCurveType = (curveId) => {
    switch (curveId) {
      case 'linear': return d3.curveLinear;
      case 'step': return d3.curveStepAfter;
      default: return d3.curveMonotoneX;
    }
  };

  // Draw point based on type
  const drawPoint = (g, x, y, type, size, color) => {
    if (type === 'none') return null;

    const point = g.append('g').attr('transform', `translate(${x},${y})`);

    switch (type) {
      case 'square':
        point.append('rect')
          .attr('x', -size / 2)
          .attr('y', -size / 2)
          .attr('width', size)
          .attr('height', size)
          .attr('fill', color);
        break;
      case 'triangle':
        const triangle = d3.symbol().type(d3.symbolTriangle).size(size * size);
        point.append('path')
          .attr('d', triangle)
          .attr('fill', color);
        break;
      case 'diamond':
        const diamond = d3.symbol().type(d3.symbolDiamond).size(size * size);
        point.append('path')
          .attr('d', diamond)
          .attr('fill', color);
        break;
      default: // circle
        point.append('circle')
          .attr('r', size / 2)
          .attr('fill', color);
    }

    return point;
  };

  // Main render effect
  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !selectedMetrics?.length) {
      // Clear chart if no data
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);

    const progressInterval = setInterval(() => {
      setRenderProgress(prev => Math.min(prev + 5, 90));
    }, 50);

    // Clear previous
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const metrics = selectedMetrics.map(m => m.id);
    const metricStyles = styleConfig?.metricStyles || {};
    const legendLabels = styleConfig?.legendLabels || {};
    const russianLabels = styleConfig?.russianLabels || {};
    const colors = styleConfig?.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const gridConfig = styleConfig?.grid || { show: true, color: '#e5e7eb', opacity: 0.5, style: 'dashed' };
    const legendConfig = styleConfig?.legend || { show: true, position: 'top' };
    const xAxisConfig = styleConfig?.xAxis || {};
    const yAxisConfig = styleConfig?.yAxis || {};
    const chartType = config?.type || 'line';

    // Apply X axis range filter
    let filteredData = data;
    const xMinIdx = xAxisConfig.minIndex !== '' && xAxisConfig.minIndex !== undefined ? parseInt(xAxisConfig.minIndex) : 0;
    const xMaxIdx = xAxisConfig.maxIndex !== '' && xAxisConfig.maxIndex !== undefined ? parseInt(xAxisConfig.maxIndex) : data.length - 1;
    
    if (xMinIdx >= 0 || xMaxIdx < data.length - 1) {
      filteredData = data.slice(
        Math.max(0, xMinIdx),
        Math.min(data.length, xMaxIdx + 1)
      );
    }

    if (filteredData.length === 0) {
      clearInterval(progressInterval);
      setIsRendering(false);
      return;
    }

    // Calculate margins
    const margin = {
      top: legendConfig.show && legendConfig.position === 'top' ? 50 : 20,
      right: legendConfig.show && legendConfig.position === 'right' ? 120 : 30,
      bottom: xAxisConfig.label ? 70 : 50,
      left: yAxisConfig.label ? 70 : 55
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Tooltip
    let tooltip = d3.select('body').select('.chart-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div').attr('class', 'chart-tooltip');
    }

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Determine X field based on dimension
    const xDimension = styleConfig?.xAxisDimension || 'date';
    const isTimeBased = ['date', 'week', 'month', 'day', 'hour'].includes(xDimension);
    
    // Get X value for each data point
    const getXValue = (d) => {
      if (isTimeBased) return d.date;
      return d.label || d.dimension || d[xDimension] || '';
    };

    // Scales - use filteredData
    const xScale = d3.scaleBand()
      .domain(filteredData.map(d => getXValue(d)))
      .range([0, chartWidth])
      .padding(0.1);

    const xScaleLinear = d3.scaleLinear()
      .domain([0, filteredData.length - 1])
      .range([0, chartWidth]);

    // Calculate y domain from filtered data
    let yMin = yAxisConfig.min !== '' ? Number(yAxisConfig.min) : null;
    let yMax = yAxisConfig.max !== '' ? Number(yAxisConfig.max) : null;

    if (yMin === null || yMax === null) {
      const allValues = filteredData.flatMap(d => metrics.map(m => d[m] || 0));
      if (yMin === null) yMin = Math.min(0, d3.min(allValues)) * 0.9;
      if (yMax === null) yMax = d3.max(allValues) * 1.1;
    }

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([chartHeight, 0]);

    // Grid
    if (gridConfig.show) {
      const gridG = g.append('g').attr('class', 'grid');
      
      const gridLineCount = yAxisConfig.gridLines || 5;
      // Fix grid line style
      let gridDash = '';
      if (gridConfig.style === 'dashed') gridDash = '6,4';
      else if (gridConfig.style === 'dotted') gridDash = '2,4';

      // Y grid lines
      if (gridConfig.yLines !== false) {
        const yTicks = yScale.ticks(gridLineCount);
        gridG.selectAll('.grid-line-y')
          .data(yTicks)
          .enter()
          .append('line')
          .attr('class', 'grid-line-y')
          .attr('x1', 0)
          .attr('x2', chartWidth)
          .attr('y1', d => yScale(d))
          .attr('y2', d => yScale(d))
          .attr('stroke', gridConfig.color)
          .attr('stroke-opacity', gridConfig.opacity)
          .attr('stroke-dasharray', gridDash);
      }

      // X grid lines
      if (gridConfig.xLines) {
        const tickStep = Math.ceil(filteredData.length / 8);
        filteredData.forEach((d, i) => {
          if (i % tickStep === 0) {
            gridG.append('line')
              .attr('class', 'grid-line-x')
              .attr('x1', xScale(getXValue(d)) + xScale.bandwidth() / 2)
              .attr('x2', xScale(getXValue(d)) + xScale.bandwidth() / 2)
              .attr('y1', 0)
              .attr('y2', chartHeight)
              .attr('stroke', gridConfig.color)
              .attr('stroke-opacity', gridConfig.opacity * 0.7)
              .attr('stroke-dasharray', gridDash);
          }
        });
      }
    }

    // X Axis
    const xAxisG = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`);

    const xTickCount = Math.min(8, filteredData.length);
    const tickStep = Math.ceil(filteredData.length / xTickCount);
    const tickValues = filteredData.filter((_, i) => i % tickStep === 0).map(d => getXValue(d));

    const xAxis = d3.axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d => {
        if (!d) return '';
        if (isTimeBased) {
          // Format as date
          const date = new Date(d);
          if (isNaN(date.getTime())) return d;
          return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        }
        // For non-time dimensions, return label as is (truncate if too long)
        return d.length > 15 ? d.substring(0, 12) + '...' : d;
      });

    xAxisG.call(xAxis)
      .selectAll('text')
      .attr('transform', `rotate(${xAxisConfig.rotation || 0})`)
      .style('text-anchor', xAxisConfig.rotation ? 'end' : 'middle')
      .style('font-size', `${xAxisConfig.fontSize || 11}px`)
      .attr('fill', '#64748b');

    if (xAxisConfig.label) {
      xAxisG.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', 45)
        .attr('fill', '#475569')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(xAxisConfig.label);
    }

    // Y Axis
    const yAxisG = g.append('g').attr('class', 'y-axis');

    const yAxisFormat = (d) => formatValue(d, yAxisConfig.format || 'auto');
    const yAxis = d3.axisLeft(yScale)
      .ticks(yAxisConfig.gridLines || 5)
      .tickFormat(yAxisFormat);

    yAxisG.call(yAxis)
      .selectAll('text')
      .style('font-size', `${yAxisConfig.fontSize || 11}px`)
      .attr('fill', '#64748b');

    if (yAxisConfig.label) {
      yAxisG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -50)
        .attr('fill', '#475569')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(yAxisConfig.label);
    }

    // Draw chart based on type
    const chartG = g.append('g').attr('class', 'chart-data');

    if (chartType === 'line' || chartType === 'area') {
      metrics.forEach((metricId, idx) => {
        const style = metricStyles[metricId] || {};
        const color = style.color || colors[idx % colors.length];
        const lineWidth = style.lineWidth || 2;
        const lineDash = getLineDash(style.lineStyle);
        const curveType = getCurveType(style.curveType);
        const fillOpacity = chartType === 'area' ? (style.fillOpacity || 0.2) : 0;

        const lineData = filteredData.filter(d => d[metricId] !== undefined && d[metricId] !== null);

        // Area fill
        if (fillOpacity > 0) {
          const area = d3.area()
            .x((d) => xScale(getXValue(d)) + xScale.bandwidth() / 2)
            .y0(chartHeight)
            .y1(d => yScale(d[metricId] || 0))
            .curve(curveType);

          chartG.append('path')
            .datum(lineData)
            .attr('class', 'chart-area')
            .attr('d', area)
            .attr('fill', color)
            .attr('fill-opacity', fillOpacity);
        }

        // Line
        const line = d3.line()
          .x((d) => xScale(getXValue(d)) + xScale.bandwidth() / 2)
          .y(d => yScale(d[metricId] || 0))
          .curve(curveType);

        const path = chartG.append('path')
          .datum(lineData)
          .attr('class', 'chart-line')
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', lineWidth);

        if (lineDash !== 'none') {
          path.attr('stroke-dasharray', lineDash);
        }

        // Points
        const pointType = style.pointType || 'circle';
        const pointSize = style.pointSize || 4;

        if (pointType !== 'none') {
          const pointsG = chartG.append('g').attr('class', 'chart-points');
          
          lineData.forEach((d, i) => {
            const x = xScale(getXValue(d)) + xScale.bandwidth() / 2;
            const y = yScale(d[metricId] || 0);
            const point = drawPoint(pointsG, x, y, pointType, pointSize, color);

            if (point && styleConfig?.showTooltips !== false) {
              point
                .style('cursor', 'pointer')
                .on('mouseover', (event) => {
                  const metricLabel = legendLabels[metricId] || russianLabels[metricId] || metricId;
                  const xLabel = isTimeBased 
                    ? new Date(d.date).toLocaleDateString('ru-RU')
                    : (d.label || getXValue(d));
                  tooltip
                    .style('opacity', 1)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`)
                    .html(`
                      <strong>${xLabel}</strong><br/>
                      <span style="color:${color}">●</span> ${metricLabel}: ${formatValue(d[metricId], yAxisConfig.format)}
                    `);
                })
                .on('mouseout', () => {
                  tooltip.style('opacity', 0);
                });
            }
          });
        }
      });

    } else if (chartType === 'bar') {
      const barWidth = (xScale.bandwidth() - 4) / metrics.length;

      metrics.forEach((metricId, idx) => {
        const style = metricStyles[metricId] || {};
        const color = style.color || colors[idx % colors.length];

        chartG.selectAll(`.bar-${idx}`)
          .data(filteredData)
          .enter()
          .append('rect')
          .attr('class', `bar bar-${idx}`)
          .attr('x', d => xScale(getXValue(d)) + 2 + idx * barWidth)
          .attr('y', d => yScale(Math.max(0, d[metricId] || 0)))
          .attr('width', Math.max(1, barWidth - 1))
          .attr('height', d => Math.abs(yScale(0) - yScale(d[metricId] || 0)))
          .attr('fill', color)
          .attr('rx', 2)
          .on('mouseover', (event, d) => {
            if (styleConfig?.showTooltips === false) return;
            const metricLabel = legendLabels[metricId] || russianLabels[metricId] || metricId;
            const xLabel = isTimeBased 
              ? new Date(d.date).toLocaleDateString('ru-RU')
              : (d.label || getXValue(d));
            tooltip
              .style('opacity', 1)
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .html(`
                <strong>${xLabel}</strong><br/>
                <span style="color:${color}">■</span> ${metricLabel}: ${formatValue(d[metricId], yAxisConfig.format)}
              `);
          })
          .on('mouseout', () => tooltip.style('opacity', 0));
      });

    } else if (chartType === 'scatter') {
      metrics.forEach((metricId, idx) => {
        const style = metricStyles[metricId] || {};
        const color = style.color || colors[idx % colors.length];
        const pointType = style.pointType || 'circle';
        const pointSize = (style.pointSize || 4) * 1.5;

        filteredData.forEach(d => {
          if (d[metricId] === undefined || d[metricId] === null) return;
          const x = xScale(getXValue(d)) + xScale.bandwidth() / 2;
          const y = yScale(d[metricId]);
          const point = drawPoint(chartG, x, y, pointType, pointSize, color);

          if (point && styleConfig?.showTooltips !== false) {
            point
              .style('cursor', 'pointer')
              .on('mouseover', (event) => {
                const metricLabel = legendLabels[metricId] || russianLabels[metricId] || metricId;
                const xLabel = isTimeBased 
                  ? new Date(d.date).toLocaleDateString('ru-RU')
                  : (d.label || getXValue(d));
                tooltip
                  .style('opacity', 1)
                  .style('left', `${event.pageX + 10}px`)
                  .style('top', `${event.pageY - 10}px`)
                  .html(`
                    <strong>${xLabel}</strong><br/>
                    <span style="color:${color}">●</span> ${metricLabel}: ${formatValue(d[metricId], yAxisConfig.format)}
                  `);
              })
              .on('mouseout', () => tooltip.style('opacity', 0));
          }
        });
      });

    } else if (chartType === 'pie') {
      // Aggregate data for pie
      const pieData = metrics.map((metricId, idx) => {
        const total = filteredData.reduce((sum, d) => sum + (d[metricId] || 0), 0);
        const style = metricStyles[metricId] || {};
        return {
          id: metricId,
          value: total,
          color: style.color || colors[idx % colors.length],
          label: legendLabels[metricId] || russianLabels[metricId] || metricId
        };
      }).filter(d => d.value > 0);

      const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
      const pieG = chartG.append('g')
        .attr('transform', `translate(${chartWidth / 2},${chartHeight / 2})`);

      const pie = d3.pie().value(d => d.value).sort(null);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
      const labelArc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

      const arcs = pieG.selectAll('.arc')
        .data(pie(pieData))
        .enter()
        .append('g')
        .attr('class', 'arc');

      arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => d.data.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('mouseover', (event, d) => {
          if (styleConfig?.showTooltips === false) return;
          const total = pieData.reduce((s, p) => s + p.value, 0);
          const pct = ((d.data.value / total) * 100).toFixed(1);
          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <span style="color:${d.data.color}">●</span> ${d.data.label}<br/>
              ${formatValue(d.data.value, yAxisConfig.format)} (${pct}%)
            `);
        })
        .on('mouseout', () => tooltip.style('opacity', 0));

      arcs.append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(d => {
          const total = pieData.reduce((s, p) => s + p.value, 0);
          const pct = (d.data.value / total) * 100;
          return pct > 5 ? `${pct.toFixed(0)}%` : '';
        });
    }

    // Legend
    if (legendConfig.show && chartType !== 'pie') {
      const legendG = svg.append('g').attr('class', 'legend');
      const fontSize = legendConfig.fontSize || 12;
      const spacing = legendConfig.itemSpacing || 20;

      let legendX = margin.left;
      let legendY = 15;
      let isVertical = false;

      if (legendConfig.position === 'bottom') {
        legendY = height - 20;
      } else if (legendConfig.position === 'right') {
        legendX = width - margin.right + 10;
        legendY = margin.top + 20;
        isVertical = true;
      } else if (legendConfig.position === 'left') {
        legendX = 10;
        legendY = margin.top + 20;
        isVertical = true;
      }

      legendG.attr('transform', `translate(${legendX},${legendY})`);

      let offsetX = 0;
      let offsetY = 0;

      metrics.forEach((metricId, idx) => {
        const style = metricStyles[metricId] || {};
        const color = style.color || colors[idx % colors.length];
        const label = legendLabels[metricId] || russianLabels[metricId] || metricId;

        const item = legendG.append('g')
          .attr('transform', `translate(${offsetX},${offsetY})`);

        item.append('rect')
          .attr('width', 14)
          .attr('height', 14)
          .attr('rx', 3)
          .attr('fill', color);

        item.append('text')
          .attr('x', 20)
          .attr('y', 11)
          .attr('fill', '#475569')
          .attr('font-size', `${fontSize}px`)
          .text(label);

        if (isVertical) {
          offsetY += spacing + 5;
        } else {
          offsetX += 20 + label.length * (fontSize * 0.6) + spacing;
        }
      });
    }

    clearInterval(progressInterval);
    setRenderProgress(100);
    setTimeout(() => setIsRendering(false), 200);

  }, [data, config, dimensions, styleConfig, selectedMetrics, formatValue]);

  // Export functions
  useImperativeHandle(ref, () => ({
    exportToPNG: async (settings = {}) => {
      const svgElement = svgRef.current;
      if (!svgElement) return;

      const { width = 1920, height = 1080, transparentBg = false } = settings;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!transparentBg) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      }

      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);

          canvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.download = `chart-${Date.now()}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            resolve();
          }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
      });
    },

    exportToSVG: () => {
      const svgElement = svgRef.current;
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    },

    exportToCSV: () => {
      if (!data?.length || !selectedMetrics?.length) return;

      const metrics = selectedMetrics.map(m => m.id);
      const legendLabels = styleConfig?.legendLabels || {};
      const russianLabels = styleConfig?.russianLabels || {};

      const headers = ['Дата', ...metrics.map(m => legendLabels[m] || russianLabels[m] || m)];
      const rows = data.map(d => [d.date, ...metrics.map(m => d[m] ?? '')]);
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.csv`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  }), [data, selectedMetrics, styleConfig]);

  return (
    <div className="canvas-container" ref={containerRef}>
      {loading && (
        <div className="canvas-loading">
          <div className="canvas-spinner"></div>
          <span>Загрузка данных...</span>
        </div>
      )}

      {isRendering && !loading && (
        <div className="canvas-rendering">
          <div className="canvas-progress">
            <div className="canvas-progress-bar" style={{ width: `${renderProgress}%` }}></div>
          </div>
          <span>Построение графика... {renderProgress}%</span>
        </div>
      )}

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="canvas-svg"
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
