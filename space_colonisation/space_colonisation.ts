
import {Pane} from 'tweakpane'


const PARAMS = {
    MAX_DIST: 150,
    MIN_DIST: 30, 
    SEGMENT_SCALE: 10, 
    ATTRACTOR_COUNT: 1000,
    DEBUG: true
}

{

    const canvas = document.createElement('canvas')
    canvas.setAttribute('id', 'space_colonisation')
    canvas.width = 600
    canvas.height = 400
    document.body.appendChild(canvas)
    
    const ctx = canvas.getContext('2d')!;

    
    class Node {
        x
        y
        parent: Node
        children
        normalizedDir
        isAsleep: boolean
        
        constructor ({x, y}, parent) {
            this.x = x
            this.y = y
            this.parent = parent
            this.children = []
            this.normalizedDir = null
            this.isAsleep = false
        }

        next({x,y}) {
            return new Node({x,y}, this)
        }

        setAsleep () {
            this.isAsleep = true;
        }
    }

    class Attractor {
        x: number
        y: number
        isKilled: boolean
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

    }

    const getDist = (a, b) => Math.sqrt(Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2))

    class Tree {
        attractors: Attractor[]
        nodes: Node[]

        constructor(attractors, nodes){
            this.attractors = attractors
            this.nodes = nodes
        }

        static init () {

            const center = [canvas.width * .5, canvas.height * .45]

            const attractors = [...Array.from(Array(PARAMS.ATTRACTOR_COUNT))].map((_, index) => {
                const [x, y] = center;
                return new Attractor({
                    x: x * (Math.random() * 2.), 
                    y: y * (Math.random() * 2.),
                    index
                })
            })
                
            const nodes = [new Node({
                    x: canvas.width * .5,
                    y: canvas.height
                }, null)];
                
            return new Tree(attractors, nodes)
            
    
        }

        addNode (nextNode) {
            this.nodes.push(nextNode)
        } 
    }

    

    


    // Iteratively draw a tree in a canvas
    const draw = (tree) => {

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

                if(dist < PARAMS.MIN_DIST + Math.random()){
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
                if(a.distance - b.distance < PARAMS.SEGMENT_SCALE * .2){
                    a.setKilled()
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
            tree.addNode(node.next({x: nextX, y: nextY}))

        })


        // draw current state
        tree.nodes.forEach((node, i) => {

            if(!node.parent){
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
            ctx.stroke()
        })

        


    }

    const drawFinalTimes = (times = 200) => {
    
        const tree = Tree.init()
        let t = 0;
        const propagate = () => {
            if(t++ < times){
                requestAnimationFrame(propagate)
            }
            draw(tree)
        }
        
        
        requestAnimationFrame(propagate)

        
    }       


    drawFinalTimes(100)

    const pane = new Pane()
    pane.addInput(PARAMS, 'MAX_DIST', {min: 70, max: 150, step: 10}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'MIN_DIST', {min: 3, max: 30}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'SEGMENT_SCALE', {min: 3, max: 20}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'ATTRACTOR_COUNT', {min:50, max:4000, step:50}).on('change', (ev) => ev.last && drawFinalTimes());
    pane.addInput(PARAMS, 'DEBUG').on('change', (ev) => ev.last && drawFinalTimes());
    
}

