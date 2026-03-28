const dq = document.querySelector.bind(document)
const dqa = document.querySelectorAll.bind(document)
const dce = document.createElement.bind(document)

const pollingQuery = (
    element: Document | Element,
    selectors: string,
    interval: number,
    timeout: number,
    immediate: boolean
): Promise<Element> => {
    return new Promise((resolve, reject) => {
        if (immediate) {
            const ele = element.querySelector(selectors)
            if (ele) {
                resolve(ele)
                return
            }
        }

        const timerPolling = setInterval(() => {
            const ele = element.querySelector(selectors)
            if (ele) {
                clearInterval(timerPolling)
                clearTimeout(timerTimeout)
                resolve(ele)
            }
        }, interval)

        const timerTimeout = setTimeout(() => {
            clearInterval(timerPolling)
            reject(new Error(`在${timeout}ms内未发现对应元素 "${selectors}"`))
        }, timeout)
    })
}

const createSvgIconElement = (svgMarkup: string, iconClasses: string[] = []): SVGElement | null => {
    const iconTemplate = document.createElement('template')
    iconTemplate.innerHTML = svgMarkup.trim()
    const icon = iconTemplate.content.firstElementChild
    if (!(icon instanceof SVGElement)) {
        return null
    }
    if (iconClasses.length > 0) {
        icon.classList.add(...iconClasses)
    }
    return icon
}

const createSvgIconWrapper = (
    svgMarkup: string,
    wrapperClass: string,
    iconClasses: string[] = []
): HTMLDivElement | null => {
    const icon = createSvgIconElement(svgMarkup, iconClasses)
    if (!icon) {
        return null
    }
    const wrapper = document.createElement('div')
    wrapper.classList.add(wrapperClass)
    wrapper.append(icon)
    return wrapper
}

export { dq, dqa, dce, pollingQuery, createSvgIconElement, createSvgIconWrapper }
