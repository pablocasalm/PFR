import { Children, forwardRef, type ReactNode } from "react"

type HorizontalScrollRowProps = {
  children: ReactNode
  className?: string
  itemClassName?: string
}

const HorizontalScrollRow = forwardRef<HTMLDivElement, HorizontalScrollRowProps>(
  ({ children, className = "", itemClassName = "" }, ref) => (
    <div
      ref={ref}
      className={`flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide ${className}`}
      style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
    >
      {Children.map(children, (child, index) => (
        <div key={index} className={`snap-start flex-shrink-0 ${itemClassName}`}>
          {child}
        </div>
      ))}
    </div>
  ),
)

HorizontalScrollRow.displayName = "HorizontalScrollRow"

export default HorizontalScrollRow
