import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import AppLayout from '../components/AppLayout'
import { useGraphData, type GraphLink, type GraphNote } from '../hooks/useGraphData'

type SimulationNode = GraphNote &
  d3.SimulationNodeDatum & {
    radius: number
  }

type SimulationLink = d3.SimulationLinkDatum<SimulationNode>

const MIN_RADIUS = 10
const MAX_RADIUS = 36

function computeRadius(backlinkCount: number, maxCount: number): number {
  if (maxCount === 0) return MIN_RADIUS
  const t = backlinkCount / maxCount
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS)
}

function buildSimulationNodes(
  nodes: GraphNote[],
): SimulationNode[] {
  const maxBacklinks = Math.max(0, ...nodes.map((n) => n.backlinkCount))

  return nodes.map((node) => ({
    ...node,
    radius: computeRadius(node.backlinkCount, maxBacklinks),
  }))
}

type ForceGraphProps = {
  nodes: GraphNote[]
  links: GraphLink[]
  onNodeClick: (noteId: string) => void
}

function ForceGraph({ nodes, links, onNodeClick }: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || nodes.length === 0) return

    const { width, height } = dimensions
    const simulationNodes = buildSimulationNodes(nodes)
    const nodeById = new Map(simulationNodes.map((node) => [node.id, node]))

    const simulationLinks: SimulationLink[] = links
      .filter(
        (link) => nodeById.has(link.source) && nodeById.has(link.target),
      )
      .map((link) => ({
        source: link.source,
        target: link.target,
      }))

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const defs = svg.append('defs')

    const gradient = defs
      .append('radialGradient')
      .attr('id', 'node-gradient')
      .attr('cx', '30%')
      .attr('cy', '30%')

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#93c5fd')
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')

    const arrowMarker = defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')

    arrowMarker
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#cbd5e1')

    const root = svg.append('g')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform)
      })

    svg.call(zoom)

    const linkGroup = root.append('g').attr('class', 'links')
    const nodeGroup = root.append('g').attr('class', 'nodes')
    const labelGroup = root.append('g').attr('class', 'labels')

    const link = linkGroup
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(simulationLinks)
      .join('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', 'url(#arrow)')

    const node = nodeGroup
      .selectAll<SVGCircleElement, SimulationNode>('circle')
      .data(simulationNodes)
      .join('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', 'url(#node-gradient)')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2))')

    const label = labelGroup
      .selectAll<SVGTextElement, SimulationNode>('text')
      .data(simulationNodes)
      .join('text')
      .text((d) => d.title)
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', '#475569')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 14)
      .attr('pointer-events', 'none')
      .each(function truncate(d) {
        const text = d3.select(this)
        const maxWidth = Math.max(d.radius * 3, 60)
        let labelText = d.title
        text.text(labelText)

        while (
          (this.getComputedTextLength?.() ?? 0) > maxWidth &&
          labelText.length > 1
        ) {
          labelText = labelText.slice(0, -1)
          text.text(`${labelText}…`)
        }
      })

    const drag = d3
      .drag<SVGCircleElement, SimulationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    node
      .on('mouseenter', (_, d) => setHoveredId(d.id))
      .on('mouseleave', () => setHoveredId(null))
      .on('click', (_, d) => onNodeClick(d.id))

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simulationLinks)
          .id((d) => d.id)
          .distance(100)
          .strength(0.6),
      )
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<SimulationNode>().radius((d) => d.radius + 8),
      )
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04))

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimulationNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimulationNode).y ?? 0)
        .attr('x2', (d) => {
          const target = d.target as SimulationNode
          const source = d.source as SimulationNode
          const dx = (target.x ?? 0) - (source.x ?? 0)
          const dy = (target.y ?? 0) - (source.y ?? 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const offset = target.radius + 4
          return (target.x ?? 0) - (dx / dist) * offset
        })
        .attr('y2', (d) => {
          const target = d.target as SimulationNode
          const source = d.source as SimulationNode
          const dx = (target.x ?? 0) - (source.x ?? 0)
          const dy = (target.y ?? 0) - (source.y ?? 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const offset = target.radius + 4
          return (target.y ?? 0) - (dy / dist) * offset
        })

      node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)

      label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links, dimensions, onNodeClick])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    svg.selectAll<SVGCircleElement, SimulationNode>('circle').attr('opacity', (d) =>
      hoveredId && hoveredId !== d.id ? 0.45 : 1,
    )

    svg.selectAll<SVGLineElement, SimulationLink>('line').attr('stroke-opacity', (d) => {
      if (!hoveredId) return 0.8
      const sourceId = (d.source as SimulationNode).id
      const targetId = (d.target as SimulationNode).id
      return sourceId === hoveredId || targetId === hoveredId ? 1 : 0.15
    })

    svg
      .selectAll<SVGCircleElement, SimulationNode>('circle')
      .filter((d) => d.id === hoveredId)
      .attr('stroke', '#1d4ed8')
      .attr('stroke-width', 2.5)

    svg
      .selectAll<SVGCircleElement, SimulationNode>('circle')
      .filter((d) => d.id !== hoveredId)
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 1.5)
  }, [hoveredId])

  return (
    <div ref={containerRef} className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  )
}

export default function GraphPage() {
  const navigate = useNavigate()
  const { nodes, links, isLoading, isError, refetch } = useGraphData()

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      if (noteId) navigate(`/note/${noteId}`)
    },
    [navigate],
  )

  const handleNodeClick = useCallback(
    (noteId: string) => {
      navigate(`/note/${noteId}`)
    },
    [navigate],
  )

  const linkedNodeCount = new Set([
    ...links.map((l) => l.source),
    ...links.map((l) => l.target),
  ]).size

  return (
    <AppLayout mobileTitle="知识图谱" onSelectNote={handleSelectNote}>
      <main className="relative flex min-h-0 flex-1 flex-col">
        <header className="relative z-10 hidden shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/80 md:flex">
          <div className="flex items-center gap-4">
            <Link
              to="/notes/edit"
              className="touch-target text-sm text-gray-500 transition-colors hover:text-gray-800"
            >
              ← 返回笔记
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">知识图谱</h1>
              <p className="text-xs text-gray-400">
                节点大小表示被引用次数 · 箭头表示引用方向
              </p>
            </div>
          </div>

          {!isLoading && !isError && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{nodes.length} 篇笔记</span>
              <span className="text-gray-300">|</span>
              <span>{links.length} 条链接</span>
              <span className="text-gray-300">|</span>
              <span>{linkedNodeCount} 个互联节点</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="touch-target ml-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600"
              >
                刷新
              </button>
            </div>
          )}
        </header>

        <div className="relative min-h-0 flex-1">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-500">加载图谱数据…</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600">加载图谱失败</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="touch-target mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {!isLoading && !isError && nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-400">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="18" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <path strokeLinecap="round" d="M8.5 7.5l5 2M15.5 16.5l-5-2M15 8l-3 3" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">还没有笔记，创建笔记并添加 [[链接]] 后即可看到图谱</p>
                <Link
                  to="/notes/edit"
                  className="touch-target mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  前往笔记
                </Link>
              </div>
            </div>
          )}

          {!isLoading && !isError && nodes.length > 0 && (
            <ForceGraph
              nodes={nodes}
              links={links}
              onNodeClick={handleNodeClick}
            />
          )}

          {!isLoading && !isError && nodes.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 hidden rounded-lg border border-gray-200/80 bg-white/90 px-4 py-3 text-xs text-gray-500 shadow-sm backdrop-blur-sm md:block">
              <p className="mb-2 font-medium text-gray-700">操作提示</p>
              <ul className="space-y-1">
                <li>· 拖拽节点调整位置</li>
                <li>· 滚轮缩放，拖动画布平移</li>
                <li>· 点击节点跳转到对应笔记</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
