let videosData = [];
let fotosData = [];
let currentCategory = 'video';
let isMuted = true;
let activeObserver = null;

$(document).ready(function () {
    initTikTok();
    setupNavigation();
    initThreeBackground();
});

function initThreeBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 800; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(20));
        vertices.push(THREE.MathUtils.randFloatSpread(20));
        vertices.push(THREE.MathUtils.randFloatSpread(20));
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: 0xfe2c55,
        size: 0.05,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const geo2 = geometry.clone();
    const mat2 = material.clone();
    mat2.color.setHex(0x25f4ee);
    const points2 = new THREE.Points(geo2, mat2);
    scene.add(points2);

    function animate() {
        requestAnimationFrame(animate);
        points.rotation.y += 0.0005;
        points2.rotation.y -= 0.0003;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

async function initTikTok() {
    const $loading = $('#full-loading');
    try {
        const jsonUrl = 'https://raw.githubusercontent.com/2mathewww/mykisah/refs/heads/main/data/hanni.json?v=' + Date.now();
        $.getJSON(jsonUrl, function (data) {
            let rawVideos = data.video || (data.list && data.list.video) || [];
            let rawFotos = data.foto || (data.list && data.list.foto) || [];

            videosData = [...new Map(rawVideos.map(v => [v.video, v])).values()];
            fotosData = [...new Map(rawFotos.map(f => [f.url || f.foto || f, f])).values()];

            renderFeed();
            $loading.fadeOut(500);
        }).fail(function () {
            $('#app-container').html('<div class="full-loading"><h3>Connect issue. Re-try later.</h3></div>');
            $loading.hide();
        });
    } catch (err) {
        $loading.hide();
    }
}

function setupNavigation() {
    $('.nav-tab').on('click', function (e) {
        e.preventDefault();
        const newCategory = $(this).attr('id') === 'tab-video' ? 'video' : 'foto';
        if (newCategory !== currentCategory) {
            currentCategory = newCategory;
            $('.nav-tab').removeClass('active');
            $(this).addClass('active');
            renderFeed();
        }
    });
}

function renderFeed() {
    const $app = $('#app-container');
    const data = currentCategory === 'video' ? videosData : fotosData;

    if (activeObserver) activeObserver.disconnect();

    if (!data || data.length === 0) {
        $app.html(`
            <div class="empty-feed" style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000;">
                <div class="flag-container">
                    <div id="three-flag-container" class="flag-placeholder" style="background: none; border: none; box-shadow: none; width: 300px; height: 300px;"></div>
                    <div class="flag-info">
                        <h3>No ${currentCategory === 'video' ? 'Videos' : 'Photos'}</h3>
                        <p style="opacity: 0.6;">Stay tuned!</p>
                    </div>
                </div>
            </div>
        `);
        initThreeFlag();
        return;
    }

    let html = '';
    data.forEach((item, index) => {
        if (currentCategory === 'video') {
            html += `
            <div class="video-slide" data-index="${index}">
                <video class="video-player" data-src="${item.video}" loop playsinline preload="metadata" muted></video>
                <div class="mute-indicator">
                    <i class="fas fa-volume-mute"></i>
                    <span>Muted</span>
                </div>
                <div class="ui-overlay">
                    <div class="video-info">
                        <h3>@2mathewww</h3>
                        <div class="meta-link">
                            <i class="${item.source?.toLowerCase() === 'tiktok' ? 'fab fa-tiktok' : (item.source?.toLowerCase() === 'instagram' ? 'fab fa-instagram' : 'fas fa-link')}"></i> 
                            <a href="${item.url}" target="_blank" style="color: inherit; text-decoration: none;">Source</a>
                        </div>
                        <div class="timestamp">${item.date}</div>
                    </div>
                    <div class="side-actions">
                        <a href="${item.video}" download="video_${index}.mp4" class="action-item">
                            <i class="fas fa-download"></i>
                            <span>Save</span>
                        </a>
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
            </div>`;
        } else {
            html += `
            <div class="video-slide" data-index="${index}">
                <img data-src="${item.url || item.foto || item}" class="lazy-img" loading="lazy" style="width:100%; height:100%; object-fit:contain; background:#000;">
                <div class="ui-overlay">
                    <div class="video-info">
                        <h3>@2mathewww</h3>
                        <div class="meta-link">
                            <i class="fas fa-link"></i> 
                            <a href="${item.url || '#'}" target="_blank" style="color: inherit; text-decoration: none;">Source</a>
                        </div>
                    </div>
                    <div class="side-actions">
                        <a href="${item.url || item.foto || item}" download="photo_${index}.jpg" class="action-item">
                            <i class="fas fa-download"></i>
                            <span>Save</span>
                        </a>
                    </div>
                </div>
            </div>`;
        }
    });

    $app.html(html);
    setupSmartLoading();
    setupVideoLogic();
    $app.scrollTop(0);
}

function setupSmartLoading() {
    activeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const el = entry.target;
            const video = el.querySelector('video');
            const img = el.querySelector('img');

            if (entry.isIntersecting) {
                if (video) {
                    if (!video.src) video.src = video.dataset.src;
                    video.muted = isMuted;
                    video.play().catch(() => { });
                }
                if (img && !img.src) {
                    img.src = img.dataset.src;
                }
            } else {
                if (video) {
                    video.pause();
                    // Optimization: Remove source if too far (Advanced)
                    // video.src = ""; video.load(); 
                }
            }
        });
    }, { threshold: 0.5 });

    $('.video-slide').each(function () { activeObserver.observe(this); });
}

function initThreeFlag() {
    const container = document.getElementById('three-flag-container');
    if (!container) return;
    const width = 300, height = 300;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(4, 2.25, 20, 20);
    const loader = new THREE.TextureLoader();
    let targetRotationX = 0, targetRotationY = 0, waveIntensity = 1;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        targetRotationY = ((e.clientX - rect.left) / width * 2 - 1) * 0.5;
        targetRotationX = -((e.clientY - rect.top) / height * 2 - 1) * 0.5;
        waveIntensity = 2;
    });

    container.addEventListener('mouseleave', () => {
        targetRotationX = 0; targetRotationY = 0; waveIntensity = 1;
    });

    loader.load('img/flag.png', function (texture) {
        const material = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide, shininess: 50 });
        const flag = new THREE.Mesh(geometry, material);
        scene.add(flag);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(2, 2, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const clock = new THREE.Clock();
        function animateFlag() {
            if (!document.getElementById('three-flag-container')) return;
            requestAnimationFrame(animateFlag);
            const time = clock.getElapsedTime();
            flag.rotation.x += (targetRotationX - flag.rotation.x) * 0.1;
            flag.rotation.y += (targetRotationY - flag.rotation.y) * 0.1;

            const pos = geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), y = pos.getY(i);
                pos.setZ(i, Math.sin(x * 1.2 + time * 2.5) * (0.15 * waveIntensity) + Math.cos(y * 1.0 + time * 2.0) * (0.1 * waveIntensity));
            }
            pos.needsUpdate = true;
            renderer.render(scene, camera);
        }
        animateFlag();
    });
}

function setupVideoLogic() {
    $(document).off('click.unmute touchstart.unmute').one('click.unmute touchstart.unmute', function () {
        isMuted = false;
        $('.video-player').each(function () { if (this.tagName === 'VIDEO') this.muted = false; });
    });

    $('.video-slide').each(function () {
        const $slide = $(this);
        const video = $slide.find('video')[0];
        if (!video) return;

        video.ontimeupdate = () => {
            const $bar = $slide.find('.progress-bar');
            if (video.duration) $bar.css('width', (video.currentTime / video.duration) * 100 + '%');
        };

        $(video).on('click', function () {
            isMuted = !isMuted;
            $('.video-player').each(function () { if (this.tagName === 'VIDEO') this.muted = isMuted; });
            const $indicator = $slide.find('.mute-indicator');
            $indicator.find('i').attr('class', 'fas ' + (isMuted ? 'fa-volume-mute' : 'fa-volume-up'));
            $indicator.find('span').text(isMuted ? 'Muted' : 'Unmuted');
            $indicator.addClass('show');
            setTimeout(() => $indicator.removeClass('show'), 1000);
            if (video.paused) video.play();
        });
    });
}
