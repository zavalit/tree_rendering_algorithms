
import {Pane} from 'tweakpane'


const PARAMS = {
    MAX_DIST: 450,
    MIN_DIST: 4, 
    SEGMENT_SCALE: 2, 
    ATTRACTOR_COUNT: 4000,
    RENDER_PERCENT: 100,
    DEBUG: false
}

{

    const canvas = document.createElement('canvas')
    canvas.setAttribute('id', 'space_colonisation')
    canvas.width = 600
    canvas.height = 400
    document.body.appendChild(canvas)
    
    const ctx = canvas.getContext('2d')!;
    
    const center = [canvas.width * .5, canvas.height * .45]
    const rootNode = {
        x: canvas.width * .5,
        y: canvas.height
    }
    class Node {
        x: number
        y: number
        index: number
        parent: Node
        children: Attractor[]
        normalizedDir

        // node that delegates an attraction to it child nodes
        isAsleep: boolean

        // node that have to be rendered
        toRender: boolean
        
        constructor ({x, y, index = 0}, parent) {
            this.x = x
            this.y = y
            this.index = index
            this.parent = parent
            this.children = []
            this.normalizedDir = null
            this.isAsleep = false
            this.toRender = true
        }

        next({x,y, index}) {
            return new Node({x,y, index}, this)
        }

        setAsleep () {
            this.isAsleep = true;
        }

        setAwake () {
            this.isAsleep = false;
        }
    }

    class Attractor {
        x: number
        y: number
        
        // according to spec an attractor that not attract any nodes
        isKilled: boolean
        // killed to avoid conflicts leeding to dead loop
        disabled: boolean
         
        index: number
        distance
        parent: Node

        constructor ({x, y, index}) {
            this.x = x
            this.y = y
            this.index = index
            this.isKilled = false
            this.distance = Infinity
        }

        setKilled () {
            this.isKilled = true
        }

        setPrevetiveKilled () {
            this.disabled = true
            this.setKilled()
        }

    }

    const getDist = (a, b) => Math.sqrt(Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2))

    class Tree {
        attractors: Attractor[]
        nodes: Node[]
        idleNodes: Node[]
        constructor(attractors, nodes){
            this.attractors = attractors
            this.nodes = nodes
            this.idleNodes = []
        }

        static initFromCenter (center) {

           

            const attractors = [...Array.from(Array(PARAMS.ATTRACTOR_COUNT))].map((_, index) => {
                const [x, y] = center;
                return new Attractor({
                    x: x * (Math.random() * 2), 
                    y: y * (Math.random() * 2),
                    // x: x + ((index % 2) - .5) * 100, 
                    // y: y + index * 30 + 50,
                    index
                })
            })
                
            const nodes = [new Node(rootNode, null)];
                
            return new Tree(attractors, nodes)
            
    
        }

        addAttractor (attractor: Attractor) {
            this.attractors.push(attractor)
            // awake nearest node
            
            let nearesNode;
            let nearestDist = Infinity
            
            this.nodes.forEach((node) => {
                const dist = getDist(node, attractor)
                if(dist < nearestDist){
                    nearestDist = dist
                    nearesNode = node
                }

            })
            if(nearesNode && nearesNode.isAsleep) {
                nearesNode.setAwake()
            }

        }

        getLastAttractorNodes (attractorsCount = 1) {
            const attractors: Attractor[] = []
            const idledNodes: Node[] = []
            for(let i = this.nodes.length - 1; i>=0; i--){
                if(attractors.length >= attractorsCount) {
                    break
                }
                if(this.nodes[i].children.length > 0){   
                    attractors.push(...this.nodes[i].children)                    
                }
                idledNodes.push(this.nodes[i])

            }
            


            return idledNodes
            
        }

        idleAttractorInTail (size = 1) {
            if(size == 0 && this.idleNodes.length === 0) return
                        
            const idleNodes = this.getLastAttractorNodes(size);
            if(idleNodes.length < this.idleNodes.length) {
                this.idleNodes.slice(idleNodes.length).forEach(node => {
                    node.toRender = true    
                })
                
            } else {
                idleNodes.forEach(node => {
                    node.toRender = false
                })
           }
            this.idleNodes = idleNodes

        }

        addNode (nextNode: Node) {
            this.nodes.push(nextNode)
        } 
    }

    

    


    // Iteratively draw a tree in a canvas
    const drawWood = (tree) => {

        if(PARAMS.SEGMENT_SCALE > PARAMS.MIN_DIST * 2.) {
            throw Error(`MIN_DIST of ${PARAMS.MIN_DIST} can not be less then a half of SEGMENT_SCALE`)
        }
    
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if(PARAMS.DEBUG) {
            tree.attractors.forEach(({x,y, isKilled}) => {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fillStyle =  isKilled ? 'blue' : '#ffffff';
                ctx.fill();
            })        
        }
        
        const activeNodes = tree.nodes.filter(n => !n.isAsleep)
    
        tree.attractors.forEach((attractor) => {
            if(attractor.isKilled) {
                return
            }
            
            let closestNode: Node | undefined;
            let closestDist = Infinity
            
            activeNodes.forEach((node: Node) => {
                const dist = getDist(node, attractor)
                
                if(dist < PARAMS.MIN_DIST){
                    console.log('dist < PARAMS.MIN_DIST', dist, attractor)
                    attractor.setKilled()
                    closestNode = undefined
                    return
                }

                if(dist < PARAMS.MAX_DIST && dist < closestDist){
                    closestDist = dist
                    closestNode = node
                }
            })

            if(!closestNode) {
                return
            }else {
                const {index} = attractor        

                // look for this attractor at the parent node
                const parentNode = closestNode.parent;
                if(parentNode) {
                    const {distance = Infinity}  = parentNode.children.find(a => a.index == index) || {}
                    // if attractor is nearer to parent, than keep it there, else clean it up
                    if (distance < closestDist) {
                        return
                    } else {
                        parentNode.children = parentNode.children.filter(a => a.index != index);
                    }
                }

                // check if this attractor is not already at this node and add it
                if(!closestNode.children.some(a => a.index === index)){
                    attractor.distance = closestDist
                    attractor.parent = closestNode
                    closestNode.children.push(attractor)
                }                
                
            }            

        })

   
        // calculate normalised direction
        console.log('activeNodes', activeNodes.length, 'from', tree.nodes.length)
        activeNodes.forEach( node => {

            // if attractor once stored, but lately changed their parent, then clean up
            node.children = node.children.filter(a => a.parent === node)

            const activeAttractors = node.children.filter(a => !a.isKilled) 
            
            // if no attractor but killed go sleep
            if(activeAttractors.length === 0) {
                node.setAsleep()
                return
            }

            // special case if 2 attractors a equally far from node
            // than kill the first one to avoid potential permanent loop
            if(activeAttractors.length > 1) {
                activeAttractors.sort((a, b) => a.distance - b.distance)
                const [a, b] = activeAttractors;
                if(Math.abs(a.distance - b.distance) < PARAMS.SEGMENT_SCALE * .1){
                    console.log('Math.abs(a.distance - b.distance) < PARAMS.SEGMENT_SCALE * .2', Math.abs(a.distance - b.distance), a, b)
                    a.setPrevetiveKilled()
                }    
            }
            

            let sumX = 0
            let sumY = 0
        
            const {x, y} = node
            for (const child of activeAttractors) {
                sumX += child.x - x
                sumY += child.y - y
            }

            const averageX = sumX/node.children.length
            const averageY = sumY/node.children.length

            const magnitude = Math.sqrt(Math.pow(averageX, 2) + Math.pow(averageY, 2))

            const normalisedX = averageX / magnitude
            const normalisedY = averageY / magnitude

            node.normalizedDir = {x : normalisedX, y: normalisedY}            
            
            const nextX = node.x + normalisedX * PARAMS.SEGMENT_SCALE
            const nextY = node.y + normalisedY * PARAMS.SEGMENT_SCALE
            tree.addNode(node.next({x: nextX, y: nextY, index: tree.nodes.length}))

        })


        // draw current state
        tree.nodes.forEach((node, i) => {

            if(!node.parent || !node.parent.toRender){
                return
            }

            if (PARAMS.DEBUG) {
                node.children.forEach(child => {
                    if(child.isKilled){
                        return
                    }
                    ctx.beginPath()
                    ctx.moveTo(node.x, node.y)
                    ctx.lineTo(child.x, child.y)
                    ctx.strokeStyle = 'grey'
                    ctx.stroke()
                })
            }
        

            ctx.beginPath()
            ctx.moveTo(node.parent.x, node.parent.y)
            ctx.lineTo(node.x, node.y)
            ctx.strokeStyle = 'red'
            ctx.lineWidth = lerpLineWidth(node)
            ctx.stroke()
        })

        


    }

    const drawLeaves = (tree) => {

        console.log('drawLeaves', tree)
        tree.attractors.filter(a => !a.disabled && a.parent.isAsleep && a.parent.index > 1 && a.parent.toRender).forEach(a => {
            drawCanvasLeaf(ctx, a.parent, a)
        })
        
    }

    const drawCanvasLeaf = (ctx, node, attractor) => {

        const {x, y} = attractor

        const leafWidth = 2
        const cpx = (node.x + x) * .5 + leafWidth
        const cpy = (node.y + y) * .5 + leafWidth
        const cpx2 = (node.x + x) * .5 - leafWidth
        const cpy2 = (node.y + y) * .5 - leafWidth


        ctx.beginPath();
        ctx.moveTo(node.x, node.y)
        ctx.quadraticCurveTo(cpx, cpy, x, y);
        ctx.quadraticCurveTo(cpx2, cpy2, node.x, node.y);
        ctx.fillStyle=("#0f0")
        ctx.strokeStyle=("#0f0")

        ctx.fill();
        ctx.stroke()
        ctx.closePath();        
    }
    const lerpLineWidth = (node) => {
        const dist = getDist(node, rootNode);
        const parentDist = getDist(node.parent, rootNode) || dist;

        return Math.min(canvas.height/(dist  - .5 * parentDist), 30) 
        
        
    }

    const drawFinalTimes = (times = 300) => {
    
        const tree = Tree.initFromCenter(center)
        let t = 0;
        const propagate = () => {
            if(t++ < times){
                requestAnimationFrame(propagate)
                drawWood(tree)

            }
        }
        
        
        requestAnimationFrame(propagate)

        
    }   
    
    const drawTimes = (times) => {
        for(let i =0;i< times; i++){
            drawWood(tree)
            
        }

        drawLeaves(tree)
    }



    
    const tree = Tree.initFromCenter(center)
    drawTimes(300)
    const testDynamicAttractorsRandom = () => {
        

        drawTimes(100)
        tree.idleAttractorInTail(900)
        drawTimes(1)
        tree.idleAttractorInTail(200)
        drawTimes(1)
    }

    const redraw = () => {

        const idleCount = PARAMS.ATTRACTOR_COUNT * (1. - PARAMS.RENDER_PERCENT * 0.01)        
        tree.idleAttractorInTail(parseInt(idleCount.toString()))
        drawTimes(1)
    }
    const testDynamicAttractors2 = () => {
        PARAMS.ATTRACTOR_COUNT = 5

        drawTimes(11)
        tree.idleAttractorInTail(3)
        drawTimes(1)
        tree.idleAttractorInTail(2)
        drawTimes(1)
    }

    
    const testDynamicAttractors = () => {
        //PARAMS.ATTRACTOR_COUNT = 1
        drawTimes(3)
        // add attractor 1
        //tree.addAttractor(new Attractor({x: canvas.width * .5, y: canvas.height - 50, index: tree.attractors.length}))
        //tree.addAttractor(new Attractor({x: canvas.width * .5 - 70, y: canvas.height - 70, index: tree.attractors.length}))
        
        drawTimes(10)
        tree.idleAttractorInTail(1)
        drawTimes(1)
        //tree.recoverAttractors(0)
        drawTimes(1)
    
        
        
    }

    //testDynamicAttractors()
    //testDynamicAttractors2()    
    //testDynamicAttractorsRandom()
    
    const pane = new Pane()
    pane.addInput(PARAMS, 'MAX_DIST', {min: 0, max: 450, step: 1}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'MIN_DIST', {min: 0, max: 100, step:.5}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'SEGMENT_SCALE', {min: 1, max: 30}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'ATTRACTOR_COUNT', {min:1, max:4000, step:1}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'RENDER_PERCENT', {min:0, max:100, step:1}).on('change', (ev) => ev.last && redraw());
    pane.addInput(PARAMS, 'DEBUG').on('change', (ev) => ev.last && drawFinalTimes());
    
}

