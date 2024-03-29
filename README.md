# GenP5: AI-assisted-generative-procedural-art
![genp5new2](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/4c6b039e-59a3-40e6-9f3e-30f9e896d34c)


This is the code base of the generative p5 project by Jiaqi Wu and Eytan Adar.

### Goal:
We explore how to amplify generative procedural art creation by connecting real-world inspirations, vague intents, and abstract patterns. 

Specifically, 

how can generative AI augment generative procedural arts cooperating with traditional function? 

How can computational methods help translate intentions and inspirations in various forms to mathematical rules in forms of code? 

### Methods
By buidling two main p5.js libraries, we enable a system with real-time stylization where user can make full use of both the
programmability of code and stylization ability of real time generative AI by:

#### 1. real-time programmable stylization for any canvas contents

e.g., stylizing the front layer to a wave:

![wave](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/6dcf51c8-f22e-41e3-a1dc-59b4d4fb2dfc)
(this example based on art from [Cloudy_v2_20220123 by SamuelYAN](https://openprocessing.org/sketch/1452002))

#### 2. creating generative procedural arts regulated by pre-determined patterns (e.g., color and geometric information)

e.g., regulate the direction of particles by shape:

![Screen_Recording_2024-02-06_at_12 49 20_PM (1)](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/8520791b-0e30-4380-914a-cf2d80f8c64d)

#### 3. example usage case:

Creating [GenP5 Algoithms](https://github.com/KolvacS-W/GenP5-Algorithm) paired with runway

![genal](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/e3e9a157-9fd9-451d-8386-948a4214abc9)


### library structure

<img width="800" alt="Screen Shot 2024-02-01 at 5 43 02 PM" src="https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/e0cf347d-820f-4c79-9732-109657075e91">

### Usage Demo

(some p5 code effects in demo/tutorial based on art of [SamuelYAN](https://openprocessing.org/user/293890/?view=sketches&o=948))

#### Use our library on p5.js web editor:


https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/1c71b62b-eb6c-4350-bf1f-42d2418e6787






### How to use:
[detail video tutorial](https://drive.google.com/file/d/1OX5YC96NN-9RhXBQGPb_Ya2MMcLeCFi-/view?usp=sharing)

1.download `multilatyer_genp5` from github and open [front end link \(p5 editor\)](https://editor.p5js.org/wujiaq/sketches/4AljpG5Nn)

2.get [fal api](https://www.fal.ai/dashboard/keys), create image save folder locally 

3.replace fal api / save path in the server.js

4.run `node server.js` in backend 

5.in frontend, write p5.js code, run front end

### ----------Other Demos-------------
#### (01/20/2024)Old interface (in app_captureSD_overlay folder): 
demo p5.js art from: [Cloudy_v2_20220123 by SamuelYAN](https://openprocessing.org/sketch/1452002)

We updated the interface, enabling user to stylize anything in p5 in real time. Simply specifying in p5.js code, certain elements will be stylized with tunable parameters

https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/ff699062-8542-4dc9-b51b-55d1bc1cce8f


### Pattern Regulation Demo:
[Shrinking particle guided by input masks](https://editor.p5js.org/wujiaq/sketches/pZSMb4Jxv)

![particle_shrink](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/cb829cc9-3475-4f7c-a0c9-cca79b2d59e8)



[Skeleton flow guided by input masks](https://editor.p5js.org/wujiaq/sketches/5BG9YMHaN)

![FinalVideo_1702851862 563730 (1)](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/d3fe2ec4-49ac-4cbb-8a37-445839adf5c3)


[programmable scenes by stable diffusion prompts(code forecoming)]()
([Inspiration from: 0xozram](https://openprocessing.org/sketch/1790022))
![sparkle](https://github.com/KolvacS-W/AI-assisted-generative-p5-/assets/55591358/cd7240ae-aab3-4bc9-ad2a-49a665955185)
